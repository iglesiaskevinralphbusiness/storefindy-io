// Shared read-side query for locations. Kept out of `src/actions/locations.js`
// (a "use server" module) so both the dashboard server action `getLocations()`
// and the public REST route `GET /api/v1/locations` return the exact same shape
// from the exact same query.
import mongoose from 'mongoose';
import { dbConnect } from '@/config/mongo.config';
import { LocationModel, UserModel } from '@/mongo';
import { serializeForClient, getUserPlan } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';
import { redirect } from 'next/navigation';
import { decodeLocationFilters, filterFieldByName } from '@/lib/ai/location-filter';
import {
    LIMITS,
    escapeRegex,
    parseObjectIdList,
    pickSortField,
    pickSortOrder,
    toBoundedInt,
    toSearchTerm,
} from '@/lib/api-sanitize';

// Columns the locations table can be sorted by — the six sortable headers in
// components/Dashboard/Locations/Table plus the default. `sort` ends up as a KEY
// in `$sort`, where a value-level sanitizer can't help, so it must come from a
// whitelist. See pickSortField().
const SORTABLE_FIELDS = [
    'name',
    'address',
    'locator',
    'published',
    'views',
    'createdAt',
    'updatedAt',
];

/**
 * IDs of the locations that fall outside the user's plan limit — the oldest
 * ones stay active, anything beyond `plan.max_location` is reported inactive.
 * Business plans are unlimited, so nothing is inactive.
 */
export async function getInactiveLocationIds(user_id) {
    await dbConnect();

    const user = await UserModel.findOne({ _id: user_id }).lean();
    if (!user) {
        return [];
    }

    const user_plan = getUserPlan(user._id.toString(), user.plan);
    const plan = plans.find((p) => p.id === user_plan) || plans[0];

    return (await LocationModel.find({ user_id })
        .sort({ createdAt: 1 }) // oldest -> newest
        .skip(plan.max_location)
        .select('_id')
        .lean()
    ).map(({ _id }) => _id.toString());
}

/**
 * Turn a validated filter list into `$match` terms.
 *
 * THE SECURITY BOUNDARY FOR THE AI FILTER LIVES HERE.
 * `decodeLocationFilters()` has already checked the list against the Zod schema
 * in src/lib/ai/location-filter.js, but this function trusts none of that on its
 * own: the Mongo *key* comes from `filterFieldByName(...).column` — a constant
 * in that catalogue — and never from the caller's `field` string, and every
 * value is used as a value only. A `contains` term is compiled as a regex, so it
 * is escaped exactly as `search` is, for the same catastrophic-backtracking
 * reason. There is no branch in which caller-supplied text becomes an operator.
 *
 * `status` is the one field with no column: it means "inside or outside the
 * plan's location allowance", which is derived at read time. It is applied as an
 * `_id` set built from getInactiveLocationIds().
 *
 * @param {Array<{field: string, operator: string, value: any}>} filters
 * @param {string[]} inactiveIds Location ids that fall outside the plan limit.
 * @returns {object} Terms to merge into the aggregation's `$match`.
 */
function buildFilterTerms(filters, inactiveIds) {
    const terms = {};

    for (const filter of filters) {
        const entry = filterFieldByName(filter.field);
        if (!entry) continue;

        if (filter.field === 'status') {
            // Strings out of getInactiveLocationIds(); `_id` is an ObjectId, so
            // they have to be cast or the set would never match anything.
            const ids = inactiveIds
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
                .map((id) => new mongoose.Types.ObjectId(id));
            const wantsInactive = filter.value === 'inactive';
            const inverted = filter.operator === 'not_equals';
            terms._id = (wantsInactive !== inverted) ? { $in: ids } : { $nin: ids };
            continue;
        }

        const column = entry.column;
        if (!column) continue;

        if (entry.kind === 'boolean') {
            terms[column] = filter.operator === 'not_equals' ? { $ne: filter.value } : filter.value;
            continue;
        }

        const value = String(filter.value).trim();
        if (!value) continue;

        if (entry.kind === 'tag') {
            // `filters` is an array of strings on the document; Mongo matches an
            // array against a scalar element-wise, so an exact tag needs no
            // `$elemMatch`. Case-insensitive so "free wifi" finds "Free Wifi".
            const pattern = new RegExp(`^${escapeRegex(value)}$`, 'i');
            terms[column] = filter.operator === 'not_equals' ? { $not: pattern } : pattern;
            continue;
        }

        // Text fields.
        if (filter.operator === 'contains') {
            terms[column] = { $regex: escapeRegex(value), $options: 'i' };
        } else if (filter.operator === 'not_equals') {
            terms[column] = { $not: new RegExp(`^${escapeRegex(value)}$`, 'i') };
        } else {
            terms[column] = { $regex: `^${escapeRegex(value)}$`, $options: 'i' };
        }
    }

    return terms;
}

/**
 * Paginated locations for one user, with the parent locator's name, a
 * concatenated address, and a plan-derived active/inactive status.
 *
 * @param {object}        options
 * @param {string}        options.user_id  Owner of the locations.
 * @param {number|string} options.page     1-based page number.
 * @param {number|string} options.rows     Results per page.
 * @param {string}        options.sort     Field to sort by.
 * @param {string}        options.order    'asc' | 'desc'.
 * @param {string}        options.search   Free text matched against name/address parts.
 * @param {string}        options.locators Comma-separated locator IDs to filter by.
 * @param {string}        options.ai       Structured filter list produced by the
 *   Locations page's natural-language filter, as the JSON its URL parameter
 *   carries. Validated by decodeLocationFilters() before it is read; anything
 *   malformed means "no filter". Absent for every other caller, including the
 *   REST API, which keeps its existing contract.
 */
export async function queryLocations({
    user_id,
    page = 1,
    rows = 10,
    sort = 'createdAt',
    order = 'asc',
    search = '',
    locators = '',
    ai = '',
} = {}) {
    // build the query
    //
    // `user_id` comes from the session or the authenticated API key, never from
    // the caller's input, so it is the one term here that isn't sanitized.
    const match = {
        user_id
    };

    // Escaped: `search` is compiled as a regex, so an unescaped payload such as
    // `(a+)+$` or `.*.*.*.*a` is a catastrophic-backtracking DoS against the
    // database, and metacharacters would otherwise silently change the match.
    const searchTerm = toSearchTerm(search);
    if (searchTerm) {
        const pattern = escapeRegex(searchTerm);
        match.$or = [
            { name: { $regex: pattern, $options: "i" } },
            { street: { $regex: pattern, $options: "i" } },
            { city: { $regex: pattern, $options: "i" } },
            { state: { $regex: pattern, $options: "i" } },
            { country: { $regex: pattern, $options: "i" } },
            { postal: { $regex: pattern, $options: "i" } }
        ];
    }

    // Validated and capped: entries feed an `$in`, and `locator_id` is later
    // passed to `$toObjectId`, which throws on a non-hex string.
    const locatorIds = parseObjectIdList(locators);
    if (locatorIds.length) {
        match.locator_id = {
            $in: locatorIds
        };
    }

    await dbConnect();

    // IDs of the locations beyond the plan's allowance. Needed here rather than
    // only after the query, because the natural-language filter can ask for
    // active/inactive, which is a `_json`-free derived value with no column.
    const inactiveIds = await getInactiveLocationIds(user_id);

    // Natural-language filter, if the page sent one. Re-validated from scratch:
    // see buildFilterTerms() for why none of this can become a Mongo operator.
    const aiFilters = decodeLocationFilters(ai);
    if (aiFilters.length) {
        Object.assign(match, buildFilterTerms(aiFilters, inactiveIds));
    }

    // pagination — clamped so `$limit`/`$skip` can't be handed an arbitrary
    // number of documents to scan or return.
    const currentPage = toBoundedInt(page, { min: 1, max: LIMITS.page, fallback: 1 });
    const currentRows = toBoundedInt(rows, { min: 1, max: LIMITS.pageSize, fallback: 10 });

    // Counted over the same `match` the results use, so the pager reflects the
    // filtered set. (It previously counted every location the user owns, which
    // was invisible while `search` was the only filter and would have been
    // plainly wrong now that a filter can cut the set to a handful.)
    const totalCount = await LocationModel.countDocuments(match);
    const totalPages = Math.ceil(totalCount / currentRows);

    // sort — whitelisted field, see SORTABLE_FIELDS
    const sortField = pickSortField(sort, SORTABLE_FIELDS, 'createdAt');
    const sortOrder = pickSortOrder(order) === 'desc' ? 1 : -1;

    const locations = serializeForClient(await LocationModel.aggregate([
        { $match: match },

        // add locator name
        { $addFields: { locatorId: { "$toObjectId": "$locator_id" } } },
        {
            $lookup: {
                from: "locatormodels",
                localField: "locatorId",
                foreignField: "_id",
                as: "locator"
            }
        },
        {
            $addFields: {
                locator: {
                    $arrayElemAt: ["$locator.name", 0]
                }
            }
        },

        // concatenate address
        {
            $addFields: {
                address: {
                    $reduce: {
                        input: {
                            $filter: {
                                input: ["$street", "$city", "$state", "$country", "$postal"],
                                as: "part",
                                cond: {
                                    $and: [
                                        { $ne: ["$$part", null] },
                                        { $ne: ["$$part", ""] }
                                    ]
                                }
                            }
                        },
                        initialValue: "",
                        in: {
                            $cond: {
                                if: { $eq: ["$$value", ""] },
                                then: "$$this",
                                else: { $concat: ["$$value", ", ", "$$this"] }
                            }
                        }
                    }
                }
            }
        },

        {
            $project: {
                locator_id: 1,
                _id: 1,
                name: 1,
                address: 1,
                published: 1,
                views: 1,
                updatedAt: 1,
                createdAt: 1,
                locator: 1,
            }
        },
        { $sort: { [sortField]: sortOrder } },
        { $skip: (currentPage - 1) * currentRows },
        { $limit: currentRows }
    ]));

    // Mark the rows that fall beyond the plan's limit (`inactiveIds` was
    // resolved above, because the filter terms may also depend on it).
    const locationsWithStatus = locations.map(location => ({
        ...location,
        status: inactiveIds.includes(String(location._id)) ? "inactive" : "active"
    }));

    // user
    const user = await UserModel.findOne({ _id: user_id }).lean();
    if (!user) {
        redirect('/sign-in');
    }

    // used counter
    const user_plan = getUserPlan(user_id, user.plan);
    const plan = plans.find(p => p.id === user_plan) || plans[0];

    const location = await LocationModel.countDocuments({ user_id });
    const location_used = location;
    const location_max = plan.max_location;

    return {
        rows: currentRows,
        page: currentPage,
        pages: totalPages === 0 ? 1 : totalPages,
        items: serializeForClient(locationsWithStatus),
        used: `${location_used} of ${location_max} used`
    };
}
