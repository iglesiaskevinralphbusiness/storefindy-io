// Shared read-side queries for locators. Kept out of `src/actions/locator.js`
// (a "use server" module) so both the dashboard server actions and the REST
// routes under /api/v1/locators return the exact same shape from the exact
// same query.
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel } from '@/mongo';
import { serializeForClient, getUserPlan } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';
import { isObjectIdString } from '@/lib/api-sanitize';

/**
 * IDs of the locators that fall outside the user's plan limit — the oldest ones
 * stay active, anything beyond `plan.max_locator` is reported inactive.
 */
export async function getInactiveLocatorIds(user_id) {
    await dbConnect();

    const user = await UserModel.findOne({ _id: user_id }).lean();
    if (!user) {
        return [];
    }

    const user_plan = getUserPlan(user_id, user.plan);
    const plan = plans.find(p => p.id === user_plan) || plans[0];
    const skip = plan.max_locator;

    return (await LocatorModel.find({ user_id })
        .sort({ createdAt: 1 }) // oldest -> newest
        .skip(skip)
        .select('_id')
        .lean()
    ).map(({ _id }) => _id.toString());
}

/**
 * Every locator owned by the user, each with its location count and a
 * plan-derived active/inactive status.
 */
export async function queryLocators(user_id) {
    await dbConnect();

    const locators = await LocatorModel.aggregate([
        {
            $match: {
                user_id,
            },
        },
        {
            $addFields: {
                locatorId: { $toString: '$_id' },
            }
        },
        {
            $lookup: {
                from: 'locationmodels', // collection name
                localField: 'locatorId',
                foreignField: 'locator_id',
                as: 'locations',
            },
        },
        {
            $addFields: {
                total_locations: { $size: '$locations' },
            },
        },
        {
            $project: {
                locations: 0, // remove the joined array
            },
        },
    ]);

    const inactiveIds = await getInactiveLocatorIds(user_id);

    const updatedLocators = locators.map(locator => ({
        ...locator,
        status: inactiveIds.includes(String(locator._id)) ? "inactive" : "active"
    }));

    return serializeForClient(updatedLocators);
}

/**
 * A single locator owned by the user, with the owner's plan and a plan-derived
 * status. Returns null when the ID is malformed or the locator is not theirs.
 */
export async function queryLocatorById(user_id, locator_id) {
    // Rejects anything that isn't a 24-hex id, so a non-string or an operator
    // object can never reach the `_id` term of the findOne() below.
    if (!isObjectIdString(locator_id)) {
        return null;
    }

    await dbConnect();

    const locator = await LocatorModel.findOne({ _id: locator_id, user_id }).lean();
    if (!locator) {
        return null;
    }

    const user = await UserModel.findOne({ _id: locator.user_id }).lean();
    if (!user) {
        return null;
    }

    const user_plan = getUserPlan(user._id.toString(), user.plan);

    // inactive ids - set inactive locators that are beyond the plan's limit
    const inactiveIds = await getInactiveLocatorIds(user_id);

    return serializeForClient({
        ...locator,
        user_plan: user_plan,
        status: inactiveIds.includes(String(locator._id)) ? 'inactive' : 'active',
    });
}
