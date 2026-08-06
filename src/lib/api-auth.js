// Bearer API key authentication for the public REST API under /api/v1.
// Keys live on the user document (`api_auth_key.value`) and are issued from
// the dashboard at /dashboard/api-access.
import { NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel } from '@/mongo';

// Single source of truth for the key format — key generation lives in
// postGenerateApiAuthKey() (src/actions/profile.js).
export const API_KEY_PREFIX = 'sf_live_';

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
 */
export async function withServerError(handler) {
    try {
        return await handler();
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { status: 'fatal', message: 'Server error. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * Resolve the caller from the `Authorization: Bearer <key>` header.
 *
 * Returns `{ user }` on success, or `{ error }` holding a ready-to-return
 * NextResponse when the header is missing, malformed, or the key is unknown.
 */
export async function authenticateApiKey(request) {
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

    const key = token.trim();
    if (!key.startsWith(API_KEY_PREFIX)) {
        return { error: jsonError('Invalid API key.', 401) };
    }

    await dbConnect();

    const user = await UserModel.findOne({ 'api_auth_key.value': key }).lean();
    if (!user) {
        return { error: jsonError('Invalid API key.', 401) };
    }

    return { user, user_id: user._id.toString(), api_key: key };
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
    if (!isValidObjectId(locator_id)) {
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
    if (!isValidObjectId(location_id)) {
        return { error: jsonError('Invalid location ID.', 400) };
    }

    await dbConnect();

    const location = await LocationModel.findOne({ _id: location_id, user_id }).lean();
    if (!location) {
        return { error: jsonError('Location not found.', 404) };
    }

    return { location };
}
