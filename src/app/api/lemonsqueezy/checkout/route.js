import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createCheckout, variantIdFromPlan, isConfigured } from '@/lib/lemonsqueezy';

export const runtime = 'nodejs';

// POST /api/lemonsqueezy/checkout
// Body: { plan: 'pro' | 'business' }  (or { variantId })
// Creates a Lemon Squeezy hosted checkout for the chosen plan and returns its
// URL for the client to redirect to.
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

    let body = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const plan = body.plan;
    const variantId = body.variantId || variantIdFromPlan(plan);

    if (!variantId) {
        return NextResponse.json(
            { status: 'error', message: 'A valid paid plan (pro or business) is required.' },
            { status: 400 }
        );
    }

    const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL || '';
    const redirectUrl = `${rootUrl}/dashboard/billing?checkout=success`;

    try {
        const url = await createCheckout({
            variantId,
            email: user.email,
            // Echoed back in the webhook so we can match the account reliably.
            custom: { user_id: user._id.toString() },
            redirectUrl,
        });

        if (!url) {
            return NextResponse.json(
                { status: 'error', message: 'Could not create a checkout.' },
                { status: 502 }
            );
        }

        return NextResponse.json({ status: 'success', url });
    } catch (error) {
        return NextResponse.json(
            { status: 'error', message: error.message || 'Checkout failed.' },
            { status: error.status || 500 }
        );
    }
}

export async function GET() {
    return json({ status: 'success', message: 'Checkout route is working.' });
}
