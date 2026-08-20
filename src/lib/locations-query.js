// Shared read-side query for locations. Kept out of `src/actions/locations.js`
// (a "use server" module) so both the dashboard server action `getLocations()`
// and the public REST route `GET /api/v1/locations` return the exact same shape
// from the exact same query.
import { dbConnect } from '@/config/mongo.config';
import { LocationModel, UserModel } from '@/mongo';
import { serializeForClient, getUserPlan } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';
import { redirect } from 'next/navigation';
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
 */
export async function queryLocations({
    user_id,
    page = 1,
    rows = 10,
    sort = 'createdAt',
    order = 'asc',
    search = '',
    locators = '',
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

    // pagination — clamped so `$limit`/`$skip` can't be handed an arbitrary
    // number of documents to scan or return.
    const currentPage = toBoundedInt(page, { min: 1, max: LIMITS.page, fallback: 1 });
    const currentRows = toBoundedInt(rows, { min: 1, max: LIMITS.pageSize, fallback: 10 });

    const totalCount = await LocationModel.countDocuments({ user_id });
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

    // inactive ids - set inactive locations that are beyond the plan's limit
    const inactiveIds = await getInactiveLocationIds(user_id);
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
    const location_used = location > plan.max_location ? plan.max_location : location;
    const location_max = plan.max_location;

    return {
        rows: currentRows,
        page: currentPage,
        pages: totalPages === 0 ? 1 : totalPages,
        items: serializeForClient(locationsWithStatus),
        used: `${location_used} of ${location_max} used`
    };
}
