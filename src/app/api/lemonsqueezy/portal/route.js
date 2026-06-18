import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSubscription, isConfigured } from '@/lib/lemonsqueezy';

export const runtime = 'nodejs';

// GET /api/lemonsqueezy/portal
// Returns the signed Lemon Squeezy customer-portal URL for the current user's
// subscription. The portal is where the customer updates their payment method,
// downloads invoices, changes plan, or cancels — all hosted by Lemon Squeezy.
export async function GET() {
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
            { status: 'error', message: 'No active subscription to manage.' },
            { status: 400 }
        );
    }

    try {
        const subscription = await getSubscription(user.ls_subscription_id);
        const urls = subscription?.attributes?.urls || {};
        const url = urls.customer_portal || null;

        if (!url) {
            return NextResponse.json(
                { status: 'error', message: 'No customer-portal URL available.' },
                { status: 502 }
            );
        }

        return NextResponse.json({
            status: 'success',
            url,
            update_payment_method: urls.update_payment_method || null,
        });
    } catch (error) {
        return NextResponse.json(
            { status: 'error', message: error.message || 'Could not open the portal.' },
            { status: error.status || 500 }
        );
    }
}
