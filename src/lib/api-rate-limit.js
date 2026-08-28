// Per-plan daily rate limiting for the public REST API under /api/v1.
//
//   free      100 requests / day
//   pro     1,000 requests / day
//   business 10,000 requests / day
//
// The caps live on the plan objects in src/utils/constant/pricing.js, next to
// max_locator / max_location, so the pricing page and the enforcement below can
// never drift apart.
//
// The window is a fixed UTC calendar day, not a rolling hour: it is trivial to
// explain in the docs ("resets at 00:00 UTC"), needs no sorted-set store, and
// the counter is one atomic mongo upsert per request — no Redis to run.
import { dbConnect } from '@/config/mongo.config';
import { ApiUsageModel } from '@/mongo';
import { plans } from '@/utils/constant/pricing';

/** The daily request cap for a plan id, falling back to the free tier. */
export function getDailyRequestLimit(plan_id) {
    const plan = plans.find((p) => p.id === plan_id) || plans[0];
    return plan.max_api_requests_per_day ?? plans[0].max_api_requests_per_day;
}

/**
 * The current UTC day window: its counter key and the instant it rolls over.
 * Everything is UTC so a serverless instance's local timezone cannot shift a
 * caller's window.
 */
function getUtcDayWindow(now = new Date()) {
    const date = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const reset = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
    );
    return { date, reset };
}

/**
 * Read the caller's quota for today without charging a request.
 *
 * Used when first-party plugin traffic is authenticated but exempt from the
 * daily cap — response headers still reflect external API usage only.
 *
 * @param {string} user_id
 * @param {string} plan_id
 * @returns {Promise<{allowed: boolean, limit: number, remaining: number, used: number, reset: Date, retry_after: number}>}
 */
export async function getApiRequestUsage(user_id, plan_id) {
    const limit = getDailyRequestLimit(plan_id);
    const { date, reset } = getUtcDayWindow();
    const retry_after = Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000));

    try {
        await dbConnect();

        const usage = await ApiUsageModel.findOne({ user_id, date }).lean();
        const used = usage?.count ?? 0;

        return {
            allowed: used <= limit,
            limit,
            remaining: Math.max(0, limit - used),
            used,
            reset,
            retry_after,
        };
    } catch (error) {
        console.log('[api-rate-limit] usage lookup unavailable', error);
        return { allowed: true, limit, remaining: limit, used: 0, reset, retry_after };
    }
}

/**
 * Count one request against the caller's daily quota.
 *
 * The increment happens first and the comparison second, in a single atomic
 * `$inc` upsert — a read-then-write would let two concurrent requests both see
 * `limit - 1` and both pass. Requests that are over the cap still increment;
 * that costs nothing and keeps the operation to one round trip.
 *
 * Fails OPEN: if the counter store is unreachable the request is allowed
 * through rather than taking the whole API down over bookkeeping.
 *
 * @param {string} user_id
 * @param {string} plan_id  'free' | 'pro' | 'business'
 * @returns {Promise<{allowed: boolean, limit: number, remaining: number, used: number, reset: Date, retry_after: number}>}
 */
export async function consumeApiRequest(user_id, plan_id) {
    const limit = getDailyRequestLimit(plan_id);
    const { date, reset } = getUtcDayWindow();
    const retry_after = Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000));

    try {
        await dbConnect();

        const usage = await incrementUsage(user_id, date, reset);
        const used = usage?.count ?? 1;

        return {
            allowed: used <= limit,
            limit,
            remaining: Math.max(0, limit - used),
            used,
            reset,
            retry_after,
        };
    } catch (error) {
        // Fail open — see the note above.
        console.log('[api-rate-limit] counter unavailable, allowing request', error);
        return { allowed: true, limit, remaining: limit, used: 0, reset, retry_after };
    }
}

/**
 * The atomic counter bump. `upsert` races against the unique { user_id, date }
 * index when two requests create the day's first row at once — the loser gets
 * E11000, at which point the row exists and a plain retry succeeds.
 */
async function incrementUsage(user_id, date, reset, attempt = 0) {
    try {
        return await ApiUsageModel.findOneAndUpdate(
            { user_id, date },
            {
                $inc: { count: 1 },
                // Swept a day after the window closes, so a support question
                // about "yesterday" can still be answered from the row.
                $setOnInsert: { expires_at: new Date(reset.getTime() + 24 * 60 * 60 * 1000) },
            },
            { returnDocument: 'after', upsert: true }
        ).lean();
    } catch (error) {
        if (error?.code === 11000 && attempt === 0) {
            return incrementUsage(user_id, date, reset, 1);
        }
        throw error;
    }
}

/**
 * Attach the standard quota headers to a response. Applied to every /api/v1
 * reply — success, error and 429 alike — so a client can back off before it
 * ever gets refused.
 */
export function withRateLimitHeaders(response, rate) {
    if (!response || !rate) return response;

    response.headers.set('X-RateLimit-Limit', String(rate.limit));
    response.headers.set('X-RateLimit-Remaining', String(rate.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.floor(rate.reset.getTime() / 1000)));

    return response;
}
