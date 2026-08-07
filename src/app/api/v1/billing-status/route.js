import { NextResponse } from 'next/server';
import { UserModel } from '@/mongo';
import { dbConnect } from '@/config/mongo.config';
import { authenticateApiKey, jsonError, withServerError } from '@/lib/api-auth';
import { reconcileUserSubscription } from '@/lib/lemonsqueezy';
import { queryBillingLimits } from '@/lib/billing-query';

// REST equivalent of getBillingStatus() — src/actions/billing.js
//
//   GET /api/v1/billing-status
//   Authorization: Bearer sf_live_...
//
// DELIBERATELY UNDOCUMENTED. This route is not listed in ENDPOINT_GROUPS on
// /dashboard/api-access, because it is not a public part of the REST API — it
// exists so the WordPress plugin can ask "may this account create another
// locator / location?" before it shows a create form. Adding it to the docs
// would invite integrations to depend on a shape meant for one internal caller.
//
// The response is the plan-limit half of getBillingStatus(): plan, caps, counts
// and the three `*_is_limit_reached` flags. It deliberately omits the billing
// email, subscription dates and the `usage` meters — the first two are personal
// data the caller does not need, and the third is JSX.
export async function GET(request) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    return withServerError(async () => {
        await dbConnect();

        // Same self-healing reconcile the billing page does: if a Lemon Squeezy
        // webhook was missed, the stored plan can lag behind reality, and the
        // plugin would then block creation the account is entitled to. Throttled
        // internally to roughly once per 10 minutes and never throws.
        const userDoc = await UserModel.findById(auth.user_id);
        if (!userDoc) {
            return jsonError('Account not found.', 404);
        }
        await reconcileUserSubscription(userDoc);

        const limits = await queryBillingLimits(auth.user_id, userDoc.toObject());
        if (!limits) {
            return jsonError('Account not found.', 404);
        }

        const { plan } = limits;

        return NextResponse.json(
            {
                id: plan.id,
                planName: plan.name,
                status: limits.status,

                locator_max: plan.max_locator,
                locator_count: limits.locator_count,
                locator_is_limit_reached: limits.locator_is_limit_reached,

                // Business is unlimited; `location_max` is null rather than 0 there
                // so a consumer never mistakes the marker for a cap of zero.
                location_max: limits.unlimited_locations ? null : plan.max_location,
                location_unlimited: limits.unlimited_locations,
                location_count: limits.location_count,
                location_is_limit_reached: limits.location_is_limit_reached,

                sub_domain_max: plan.max_sub_domain,
                sub_domain_count: limits.sub_domain_count,
                sub_domain_is_limit_reached: limits.sub_domain_is_limit_reached,
            },
            { status: 200 }
        );
    });
}
