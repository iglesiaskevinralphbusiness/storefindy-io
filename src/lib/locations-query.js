// Shared read-side query for locations. Kept out of `src/actions/locations.js`
// (a "use server" module) so both the dashboard server action `getLocations()`
// and the public REST route `GET /api/v1/locations` return the exact same shape
// from the exact same query.
import { dbConnect } from '@/config/mongo.config';
import { LocationModel, UserModel } from '@/mongo';
import { serializeForClient, getUserPlan } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';

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

    const user_plan = getUserPlan(user._id.toString());
    const plan = plans.find((p) => p.id === user_plan) || plans[0];

    if (plan.id === 'business') {
        return [];
    }

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
    const match = {
        user_id
    };
    if (search) {
        match.$or = [
            { name: { $regex: search, $options: "i" } },
            { street: { $regex: search, $options: "i" } },
            { city: { $regex: search, $options: "i" } },
            { state: { $regex: search, $options: "i" } },
            { country: { $regex: search, $options: "i" } },
            { postal: { $regex: search, $options: "i" } }
        ];
    }
    if (locators) {
        match.locator_id = {
            $in: locators.split(",")
        };
    }

    await dbConnect();

    // pagination
    const currentPage = Number(page) > 0 ? Number(page) : 1;
    const currentRows = Number(rows) > 0 ? Number(rows) : 10;

    const totalCount = await LocationModel.countDocuments({ user_id });
    const totalPages = Math.ceil(totalCount / currentRows);

    // sort
    const sortField = sort || 'updatedAt';
    const sortOrder = order === 'desc' ? 1 : -1;

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

    // used counter
    const user_plan = getUserPlan(user_id);
    const plan = plans.find(p => p.id === user_plan) || plans[0];

    const location = await LocationModel.countDocuments({ user_id });
    const location_used = plan.id === 'business' ? location : location > plan.max_location ? plan.max_location : location;
    const location_max = plan.max_location;

    return {
        rows: currentRows,
        page: currentPage,
        pages: totalPages === 0 ? 1 : totalPages,
        items: serializeForClient(locationsWithStatus),
        used: plan.id === 'business' ? `${location_used} used` : `${location_used} of ${location_max} used`
    };
}
