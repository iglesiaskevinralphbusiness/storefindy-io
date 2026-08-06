// Bearer API key authentication for the public REST API under /api/v1.
// Keys live on the user document (`api_auth_key.value`) and are issued from
// the dashboard at /dashboard/api-access.
import { NextResponse } from 'next/server';
import { dbConnect } from '@/config/mongo.config';
import { UserModel } from '@/mongo';

// Single source of truth for the key format — key generation lives in
// postGenerateApiAuthKey() (src/actions/profile.js).
export const API_KEY_PREFIX = 'sf_live_';

export function jsonError(message, status = 400, extra = {}) {
    return NextResponse.json({ success: false, error: message, ...extra }, { status });
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
