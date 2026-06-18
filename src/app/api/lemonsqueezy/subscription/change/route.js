import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
    changeSubscriptionVariant,
    variantIdFromPlan,
    mapSubscription,
    isConfigured,
} from '@/lib/lemonsqueezy';

export const runtime = 'nodejs';

// POST /api/lemonsqueezy/subscription/change
// Body: { plan: 'pro' | 'business' }
// Upgrades/downgrades an existing subscription by swapping its variant. For
// brand-new subscriptions (no subscription on file) use /checkout instead.
export async function POST(request) {
    if (!isConfigured()) {
        return NextResponse.json(
            { status: 'error', message: 'Lemon Squeezy is not configured yet.' },
            { status: 503 }
        );
    }

    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ status: 'error', message: 'Not authenticated.' }, { status: 401 });
    }

    if (!user.ls_subscription_id) {
        return NextResponse.json(
            { status: 'error', message: 'No subscription to change. Start a checkout instead.' },
            { status: 400 }
        );
    }

    let body = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const variantId = body.variantId || variantIdFromPlan(body.plan);
    if (!variantId) {
        return NextResponse.json(
            { status: 'error', message: 'A valid paid plan (pro or business) is required.' },
            { status: 400 }
        );
    }

    try {
        const resource = await changeSubscriptionVariant(user.ls_subscription_id, variantId);
        const live = resource ? mapSubscription(resource) : null;

        if (live) {
            user.plan = live.plan;
            user.status = live.status;
            user.ls_variant_id = live.ls_variant_id;
            user.ls_product_id = live.ls_product_id || user.ls_product_id;
            if (live.renewal_date) user.renewal_date = live.renewal_date;
            await user.save();
        }

        return NextResponse.json({
            status: 'success',
            message: 'Your plan has been updated.',
            subscription: { plan: user.plan, status: user.status, renewal_date: user.renewal_date },
        });
    } catch (error) {
        return NextResponse.json(
            { status: 'error', message: error.message || 'Could not change the plan.' },
            { status: error.status || 500 }
        );
    }
}
