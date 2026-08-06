// Bearer API key authentication for the public REST API under /api/v1.
// Keys live on the user document (`api_key`) and are issued from the
// dashboard at /dashboard/api-access.
import { NextResponse } from 'next/server';
import { dbConnect } from '@/config/mongo.config';
import { UserModel } from '@/mongo';

const KEY_PREFIX = 'sf_live_';

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
    if (!key.startsWith(KEY_PREFIX)) {
        return { error: jsonError('Invalid API key.', 401) };
    }

    await dbConnect();

    const user = await UserModel.findOne({ api_key: key }).lean();
    if (!user) {
        return { error: jsonError('Invalid API key.', 401) };
    }

    // Best-effort "last used" stamp — never block the response on it.
    UserModel.updateOne(
        { _id: user._id },
        { $set: { api_key_last_used_at: new Date().toISOString() } }
    ).catch(() => {});

    return { user, user_id: user._id.toString() };
}
