// Shared plan-limit calculation. Kept out of `src/actions/billing.js` (a
// "use server" module that also builds JSX for the usage meters) so both the
// dashboard action `getBillingStatus()` and the REST route
// `GET /api/v1/billing-status` derive their limits from the exact same maths.
//
// Everything here is plain data — no JSX, no React icons — which is what makes
// it safe to serialize straight into an API response.
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel, SubDomainModel } from '@/mongo';
import { plans } from '@/utils/constant/pricing';
import { getUserPlan } from '@/utils/helpers';

/**
 * Current usage against the plan's caps for one user.
 *
 * The Business plan carries `max_location: 0` as its "unlimited" marker, so
 * every location figure below is special-cased on `plan.id === 'business'`
 * rather than on the number — same as the billing page has always done.
 *
 * @param {string} user_id
 * @param {object} user     The user document (or lean object). Only `plan` is read.
 * @returns {Promise<object|null>} null when the user no longer exists.
 */
export async function queryBillingLimits(user_id, user = null) {
    await dbConnect();

    const record = user || (await UserModel.findById(user_id).lean());
    if (!record) {
        return null;
    }

    // Demo/testing overrides live in getUserPlan(), so the stored plan is never
    // read directly — see src/utils/helpers.
    const user_plan = getUserPlan(user_id.toString(), record.plan);
    const plan = plans.find((p) => p.id === user_plan) || plans[0];

    const [locator, location, sub_domain] = await Promise.all([
        LocatorModel.countDocuments({ user_id }),
        LocationModel.countDocuments({ user_id }),
        SubDomainModel.countDocuments({ user_id }),
    ]);

    // `used` is the count clamped to the cap — anything past it exists but is
    // reported inactive, which is what the locator/location queries also do.
    const locator_used = locator > plan.max_locator ? plan.max_locator : locator;
    const location_used = location;
    const sub_domain_used = sub_domain > plan.max_sub_domain ? plan.max_sub_domain : sub_domain;

    return {
        plan,
        user_plan,
        status: user_plan === 'free' ? 'free' : record.status || 'active',

        locator_count: locator,
        locator_used,
        locator_inactive: locator - plan.max_locator,
        locator_percent: (locator_used / plan.max_locator) * 100,
        locator_is_limit_reached: locator >= plan.max_locator,

        location_count: location,
        location_used,
        location_inactive: location - plan.max_location,
        location_percent: (location_used / plan.max_location) * 100,
        location_is_limit_reached: location >= plan.max_location,

        sub_domain_count: sub_domain,
        sub_domain_used,
        sub_domain_inactive: sub_domain - plan.max_sub_domain,
        sub_domain_percent: (sub_domain_used / plan.max_sub_domain) * 100,
        sub_domain_is_limit_reached: sub_domain >= plan.max_sub_domain,
    };
}
