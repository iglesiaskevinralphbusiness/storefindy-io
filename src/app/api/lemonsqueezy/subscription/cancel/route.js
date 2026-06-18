import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { cancelSubscription, mapSubscription, isConfigured } from '@/lib/lemonsqueezy';

export const runtime = 'nodejs';

// POST /api/lemonsqueezy/subscription/cancel
// Cancels the subscription at the end of the current billing period. Lemon
// Squeezy keeps it active until `ends_at`; the webhook will also sync this, but
// we update our DB immediately for a responsive UI.
export async function POST() {
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
            { status: 'error', message: 'No active subscription to cancel.' },
            { status: 400 }
        );
    }

    try {
        const resource = await cancelSubscription(user.ls_subscription_id);
        const live = resource ? mapSubscription(resource) : null;

        user.status = live?.status || 'cancelled';
        if (live?.ends_at) user.renewal_date = live.ends_at;
        await user.save();

        return NextResponse.json({
            status: 'success',
            message: 'Your subscription will end at the close of the current billing period.',
            subscription: { status: user.status, renewal_date: user.renewal_date },
        });
    } catch (error) {
        return NextResponse.json(
            { status: 'error', message: error.message || 'Could not cancel the subscription.' },
            { status: error.status || 500 }
        );
    }
}
