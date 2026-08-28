import { NextResponse } from 'next/server';
import { UserModel } from '@/mongo';
import { dbConnect } from '@/config/mongo.config';
import { authenticateApiKey, jsonError, withServerError } from '@/lib/api-auth';
import { queryAnalyticsData } from '@/lib/analytics-query';

// REST equivalent of getAnalyticsData() — src/actions/locator.js
//
//   GET /api/v1/analytics?range=30&locator=all
//   Authorization: Bearer sf_live_...
//
// DELIBERATELY UNDOCUMENTED. This route is not listed in ENDPOINT_GROUPS on
// /dashboard/api-access, because it is not a public part of the REST API — it
// exists so the WordPress plugin can render Store Locator → Analytics. Adding
// it to the docs would invite integrations to depend on a shape meant for one
// internal caller.
//
// Query params mirror the dashboard analytics page:
//   range   — 1 (today), 7, 30, 90, or 365 days
//   locator — locator id, or `all`
//
// Returns the same JSON payload as getAnalyticsData(). Free plans receive 403.
export async function GET(request) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    return withServerError(async () => {
        await dbConnect();

        const userDoc = await UserModel.findById(auth.user_id).lean();
        if (!userDoc) {
            return jsonError('Account not found.', 404);
        }

        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '30';
        const locator = searchParams.get('locator') || 'all';

        const data = await queryAnalyticsData({
            user_id: auth.user_id,
            user_plan: userDoc.plan,
            range,
            locator,
        });

        if (!data) {
            return jsonError(
                'Analytics is not available on your current plan. Upgrade to Pro or Business.',
                403
            );
        }

        return NextResponse.json(data, { status: 200 });
    }, auth);
}
