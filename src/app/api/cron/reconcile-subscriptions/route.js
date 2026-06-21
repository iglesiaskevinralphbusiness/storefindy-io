import { NextResponse } from 'next/server';
import { dbConnect } from '@/config/mongo.config';
import { UserModel } from '@/mongo';
import { reconcileUserSubscription, isConfigured } from '@/lib/lemonsqueezy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Belt-and-braces: never let this be statically cached / pre-rendered.
export const revalidate = 0;

// GET /api/cron/reconcile-subscriptions
//
// Safety net for the webhook + on-read sync: re-syncs every paying account with
// Lemon Squeezy so a SILENT EXPIRY (a missed `subscription_expired` webhook from
// a user who never opens the billing page) still gets downgraded to free.
//
// Host-agnostic — protect it with a bearer token and point any scheduler at it:
//   • Vercel Cron  → add to vercel.json (see crons snippet) + set CRON_SECRET
//   • cron-job.org / GitHub Actions / system crontab → curl with the header:
//       curl -H "Authorization: Bearer $CRON_SECRET" https://storefindy.com/api/cron/reconcile-subscriptions
//
// Daily is plenty (expiry is not time-critical to the minute).
export async function GET(request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json(
            { status: 'error', message: 'CRON_SECRET is not configured.' },
            { status: 503 }
        );
    }

    // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; allow a ?key= too
    // for schedulers that can't set headers.
    const auth = request.headers.get('authorization') || '';
    const keyParam = new URL(request.url).searchParams.get('key') || '';
    if (auth !== `Bearer ${secret}` && keyParam !== secret) {
        return NextResponse.json({ status: 'error', message: 'Unauthorized.' }, { status: 401 });
    }

    if (!isConfigured()) {
        return NextResponse.json(
            { status: 'error', message: 'Lemon Squeezy is not configured yet.' },
            { status: 503 }
        );
    }

    await dbConnect();

    // Only accounts that actually have (or had) a subscription — free users with
    // no Lemon Squeezy footprint are nothing to reconcile.
    const users = await UserModel.find({
        $or: [
            { ls_subscription_id: { $nin: ['', null] } },
            { plan: { $ne: 'free' } },
        ],
    });

    let checked = 0;
    let synced = 0;
    let downgraded = 0;
    const errors = [];

    // Reconcile in small batches to avoid hammering the LS API all at once.
    const BATCH = 5;
    for (let i = 0; i < users.length; i += BATCH) {
        const batch = users.slice(i, i + BATCH);
        await Promise.all(
            batch.map(async (user) => {
                checked += 1;
                const before = user.plan;
                try {
                    // force: true — the cron is the authoritative periodic check,
                    // so bypass the on-read throttle.
                    const ran = await reconcileUserSubscription(user, { force: true });
                    if (ran) synced += 1;
                    if (before !== 'free' && user.plan === 'free') downgraded += 1;
                } catch (err) {
                    errors.push({ user: String(user._id), message: err?.message || 'reconcile failed' });
                }
            })
        );
    }

    return NextResponse.json({ status: 'success', checked, synced, downgraded, errors });
}
