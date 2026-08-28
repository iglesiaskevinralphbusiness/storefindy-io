// Recognises first-party Storefindy WordPress plugin traffic on /api/v1.
//
// The official plugin sends a private header alongside the user's Bearer key.
// When it matches STOREFINDY_WP_INTEGRATION_TOKEN, authenticateApiKey() skips
// the daily quota — plugin admin screens should never burn the customer's
// documented API-access limit.
//
// This is deliberately absent from /dashboard/api-access. Direct integrations
// that only send Authorization: Bearer sf_live_... are still rate-limited.
import { timingSafeEqual } from 'crypto';

export const WP_INTEGRATION_HEADER = 'x-storefindy-integration-token';

/** @returns {boolean} */
export function isWordPressPluginRequest(request) {
    const expected = process.env.STOREFINDY_WP_INTEGRATION_TOKEN;
    if (!expected) {
        return false;
    }

    const provided = (request.headers.get(WP_INTEGRATION_HEADER) || '').trim();
    if (!provided || provided.length !== expected.length) {
        return false;
    }

    try {
        return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    } catch {
        return false;
    }
}
