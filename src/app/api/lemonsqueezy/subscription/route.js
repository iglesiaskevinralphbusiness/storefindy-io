import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSubscription, mapSubscription, isConfigured } from '@/lib/lemonsqueezy';

export const runtime = 'nodejs';

// GET /api/lemonsqueezy/subscription
// Returns the current user's subscription as stored in our DB, enriched with
// live details from Lemon Squeezy (card brand/last4, portal URLs) when a
// subscription exists and the API is configured. Degrades gracefully — the DB
// fields alone are enough to render the billing page.
export async function GET() {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ status: 'error', message: 'Not authenticated.' }, { status: 401 });
    }

    const subscription = {
        plan: user.plan || 'free',
        status: user.status || 'active',
        billing_email: user.email,
        plan_started: user.plan === 'free' ? '' : user.plan_started || '',
        renewal_date: user.renewal_date || '',
        trial_ends_at: user.trial_ends_at || '',
        ls_customer_id: user.ls_customer_id || '',
        ls_subscription_id: user.ls_subscription_id || '',
        ls_variant_id: user.ls_variant_id || '',
        card_brand: '',
        card_last_four: '',
        urls: {},
    };

    // Enrich with live data when we have a subscription on file.
    if (user.ls_subscription_id && isConfigured()) {
        try {
            const resource = await getSubscription(user.ls_subscription_id);
            if (resource) {
                const live = mapSubscription(resource);
                subscription.plan = live.plan;
                subscription.status = live.status;
                subscription.plan_started = live.plan === 'free' ? '' : live.plan_started;
                subscription.renewal_date = live.renewal_date;
                subscription.trial_ends_at = live.trial_ends_at;
                subscription.card_brand = live.card_brand;
                subscription.card_last_four = live.card_last_four;
                subscription.urls = live.urls;
            }
        } catch {
            // Live lookup failed (e.g. transient API error) — fall back to the
            // DB snapshot we already populated above.
        }
    }

    return NextResponse.json({ status: 'success', subscription });
}
