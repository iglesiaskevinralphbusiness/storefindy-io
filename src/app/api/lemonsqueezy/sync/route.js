import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
    getSubscription,
    listSubscriptions,
    mapSubscription,
    applySubscriptionToUser,
    isConfigured,
} from '@/lib/lemonsqueezy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/lemonsqueezy/sync
// Reconciles the signed-in user's plan with Lemon Squeezy on demand. This is the
// fallback for the webhook: the billing page calls it after a successful
// checkout (?checkout=success) so the plan updates even when the webhook can't
// reach us (e.g. localhost / staging behind a private host). Safe to call
// repeatedly — it just mirrors whatever LS currently reports.
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

    try {
        // Prefer the subscription id we already have; otherwise look it up by the
        // billing email and take the most recently created one.
        let resource = null;

        if (user.ls_subscription_id) {
            resource = await getSubscription(user.ls_subscription_id);
        }

        if (!resource) {
            const subs = await listSubscriptions({ email: user.email });
            resource = pickLatest(subs);
        }

        if (!resource) {
            return NextResponse.json({
                status: 'pending',
                message: 'No subscription found on Lemon Squeezy yet.',
            });
        }

        applySubscriptionToUser(user, mapSubscription(resource));
        await user.save();

        return NextResponse.json({
            status: 'success',
            subscription: {
                plan: user.plan,
                status: user.status,
                renewal_date: user.renewal_date,
                plan_started: user.plan_started,
                trial_ends_at: user.trial_ends_at,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { status: 'error', message: error.message || 'Sync failed.' },
            { status: error.status || 500 }
        );
    }
}

// Choose the newest subscription by created_at, so a fresh checkout wins over an
// older expired one if the email has more than one.
function pickLatest(subs) {
    if (!Array.isArray(subs) || subs.length === 0) return null;
    return subs
        .slice()
        .sort((a, b) => {
            const da = a?.attributes?.created_at || '';
            const db = b?.attributes?.created_at || '';
            return db.localeCompare(da);
        })[0];
}
