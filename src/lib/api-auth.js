// Bearer API key authentication for the public REST API under /api/v1.
// Keys live on the user document (`api_auth_key.value`) and are issued from
// the dashboard at /dashboard/api-access.
import { NextResponse } from 'next/server';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel } from '@/mongo';
import { isObjectIdString } from '@/lib/api-sanitize';
import { consumeApiRequest, getApiRequestUsage, withRateLimitHeaders } from '@/lib/api-rate-limit';
import { plans } from '@/utils/constant/pricing';
import { getUserPlan } from '@/utils/helpers';
import { isWordPressPluginRequest } from '@/lib/wp-integration-auth';

// Single source of truth for the key format — key generation lives in
// postGenerateApiAuthKey() (src/actions/profile.js).
export const API_KEY_PREFIX = 'sf_live_';

/** 'pro' -> 'Pro'. Only used to word the 429 message. */
function planLabel(plan_id) {
    return (plans.find((p) => p.id === plan_id) || plans[0]).name;
}

export function jsonError(message, status = 400, extra = {}) {
    return NextResponse.json({ success: false, error: message, ...extra }, { status });
}

/** Field-level validation failure, matching the server actions' error shape. */
export function jsonValidationError(errors) {
    return NextResponse.json({ status: 'error', errors }, { status: 400 });
}

/** Mirrors the actions' `{ status: 'success', message }` return, plus the resource. */
export function jsonSuccess(message, data = undefined, status = 200) {
    return NextResponse.json(
        data === undefined ? { status: 'success', message } : { status: 'success', message, data },
        { status }
    );
}

/**
 * Wrap a route handler so an unexpected throw becomes a 500 instead of an
 * unhandled rejection. Mirrors the actions' `{ status: 'fatal' }` catch blocks.
 *
 * Pass the `authenticateApiKey()` result as the second argument and the quota
 * headers are stamped on whatever the handler returns, so success and failure
 * responses report the same X-RateLimit-* values.
 */
export async function withServerError(handler, auth = null) {
    try {
        return withRateLimitHeaders(await handler(), auth?.rate);
    } catch (error) {
        console.log(error);
        return withRateLimitHeaders(
            NextResponse.json(
                { status: 'fatal', message: 'Server error. Please try again.' },
                { status: 500 }
            ),
            auth?.rate
        );
    }
}

/**
 * Resolve the caller from the `Authorization: Bearer <key>` header, then charge
 * the request against their plan's daily quota.
 *
 * Returns `{ user, user_id, api_key, plan, rate }` on success, or `{ error }`
 * holding a ready-to-return NextResponse when the header is missing, malformed,
 * the key is unknown, or the daily quota is exhausted (429).
 *
 * @param {Request} request
 * @param {{ rate_limit?: boolean }} options  Set `rate_limit: false` to
 *   authenticate without consuming quota — used by internal routes. Official
 *   WordPress plugin requests are also exempt when they send the private
 *   integration header (see wp-integration-auth.js); that path is not documented
 *   on /dashboard/api-access.
 */
export async function authenticateApiKey(request, { rate_limit = true } = {}) {
    const header = request.headers.get('authorization') || '';
    const [scheme, token] = header.split(' ');

    if (!header || scheme?.toLowerCase() !== 'bearer' || !token) {
        return {
            error: jsonError(
                'Missing or malformed Authorization header. Expected: Authorization: Bearer <api_key>',
                401
            ),
        };
    }

    // `key` is always a string (it comes out of a header split), so it can't
    // carry a Mongo operator into the lookup below. The length cap just keeps an
    // oversized header from becoming a query term.
    const key = token.trim();
    if (!key.startsWith(API_KEY_PREFIX) || key.length > 200) {
        return { error: jsonError('Invalid API key.', 401) };
    }

    await dbConnect();

    const user = await UserModel.findOne({ 'api_auth_key.value': key }).lean();
    if (!user) {
        return { error: jsonError('Invalid API key.', 401) };
    }

    // API access is available on every plan — the per-plan daily request quota is
    // what differentiates them, not the ability to hold a working key.
    const user_id = user._id.toString();
    // Demo/testing overrides live in getUserPlan(), so the stored plan is never
    // read directly — same as billing-query.js.
    const plan = getUserPlan(user_id, user.plan);
    const from_wordpress = isWordPressPluginRequest(request);
    const should_rate_limit = rate_limit && !from_wordpress;

    if (!should_rate_limit) {
        const rate =
            from_wordpress && rate_limit
                ? await getApiRequestUsage(user_id, plan)
                : null;
        return { user, user_id, api_key: key, plan, rate };
    }

    const rate = await consumeApiRequest(user_id, plan);
    if (!rate.allowed) {
        const upgrade =
            plan === 'business'
                ? ''
                : ' Upgrade your plan for a higher limit.';
        const response = jsonError(
            `Daily API request limit reached — ${rate.limit} requests per day on the ${planLabel(plan)} plan. The quota resets at 00:00 UTC.${upgrade}`,
            429,
            { plan, limit: rate.limit, reset: rate.reset.toISOString() }
        );
        response.headers.set('Retry-After', String(rate.retry_after));
        return { error: withRateLimitHeaders(response, rate) };
    }

    return { user, user_id, api_key: key, plan, rate };
}

/**
 * Authorization for a single locator: confirms the ID is well-formed and that
 * the locator belongs to the caller. Returns `{ locator }` or `{ error }`.
 *
 * Unlike the dashboard actions — which trust IDs coming from the user's own
 * rendered page — every /api/v1 write must prove ownership, otherwise a valid
 * key could read or modify another account's records by guessing IDs.
 */
export async function requireOwnedLocator(user_id, locator_id) {
    // Strict 24-hex, not mongoose's isValidObjectId() — see isObjectIdString().
    if (!isObjectIdString(locator_id)) {
        return { error: jsonError('Invalid locator ID.', 400) };
    }

    await dbConnect();

    const locator = await LocatorModel.findOne({ _id: locator_id, user_id }).lean();
    if (!locator) {
        return { error: jsonError('Locator not found.', 404) };
    }

    return { locator };
}

/** Authorization for a single location — see requireOwnedLocator(). */
export async function requireOwnedLocation(user_id, location_id) {
    if (!isObjectIdString(location_id)) {
        return { error: jsonError('Invalid location ID.', 400) };
    }

    await dbConnect();

    const location = await LocationModel.findOne({ _id: location_id, user_id }).lean();
    if (!location) {
        return { error: jsonError('Location not found.', 404) };
    }

    return { location };
}
