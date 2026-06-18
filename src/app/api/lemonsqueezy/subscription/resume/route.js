import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { resumeSubscription, mapSubscription, isConfigured } from '@/lib/lemonsqueezy';

export const runtime = 'nodejs';

// POST /api/lemonsqueezy/subscription/resume
// Undoes a pending cancellation so the subscription renews as normal.
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
            { status: 'error', message: 'No subscription to resume.' },
            { status: 400 }
        );
    }

    try {
        const resource = await resumeSubscription(user.ls_subscription_id);
        const live = resource ? mapSubscription(resource) : null;

        user.status = live?.status || 'active';
        if (live?.renewal_date) user.renewal_date = live.renewal_date;
        await user.save();

        return NextResponse.json({
            status: 'success',
            message: 'Your subscription has been resumed.',
            subscription: { status: user.status, renewal_date: user.renewal_date },
        });
    } catch (error) {
        return NextResponse.json(
            { status: 'error', message: error.message || 'Could not resume the subscription.' },
            { status: error.status || 500 }
        );
    }
}
