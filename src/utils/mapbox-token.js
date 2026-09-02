// Server-only accessor for the Mapbox access token.
//
// The token is deliberately NOT a NEXT_PUBLIC_* variable. mapbox-gl needs it in
// the browser, but baking it into the public widget bundle would hand the same
// token to every embed on every plan. Instead the callers below inject it into a
// single locator's payload, and only when that locator is actually configured
// for Mapbox on a plan allowed to use it:
//   - the customize page / demo page pass it to <CustomizeWrapper /> as a prop
//   - GET /api/get-locator/:id returns it alongside the locator document
//
// PUBLIC vs SECRET tokens
// -----------------------
// Mapbox issues two kinds of token and only one of them may ever reach a
// browser:
//   pk.*  public  — designed to ship in client code; scope it with URL
//                   restrictions in the Mapbox dashboard.
//   sk.*  secret  — server-side only. mapbox-gl.js refuses to initialise with
//                   one ("Use a public access token (pk.*) with Mapbox GL JS"),
//                   and publishing it would let anyone bill the account.
//
// So the resolution below prefers MAP_BOX_LIVE_API_KEY in production and
// MAP_BOX_PUBLIC_API_KEY in development, but a value that is not a public token
// is never returned — it is skipped in favour of one that is. As configured
// today MAP_BOX_LIVE_API_KEY holds an sk.* secret, so both environments
// correctly resolve to the pk.* token. To use a separate production token, set
// MAP_BOX_LIVE_API_KEY to a *public* (pk.*) one and move the secret to its own
// server-only variable.

import { canUseMapbox, MAP_LIBRARY_MAPBOX } from '@/utils/constant/mapbox-styles';

const PUBLIC_TOKEN_PREFIX = 'pk.';

function publicToken(value) {
    const token = String(value ?? '').trim();
    return token.startsWith(PUBLIC_TOKEN_PREFIX) ? token : '';
}

export function getMapboxToken() {
    const dev = publicToken(process.env.MAP_BOX_PUBLIC_API_KEY);
    const live = publicToken(process.env.MAP_BOX_LIVE_API_KEY);
    const preferred = process.env.NODE_ENV === 'production' ? live : dev;
    // Falls back to whichever public token exists, so a half-configured
    // environment degrades to "no Mapbox" rather than to a broken map or a
    // leaked secret.
    return preferred || live || dev;
}

/**
 * The token for a locator's *saved* configuration — used by the public widget
 * endpoint, where handing out a token the locator has no use for is pointless
 * exposure.
 */
export function getMapboxTokenForLocator(locator, user_plan) {
    if (!locator || locator.map_library !== MAP_LIBRARY_MAPBOX) return '';
    if (!canUseMapbox(user_plan)) return '';
    return getMapboxToken();
}

/**
 * The token for the customize screen. Gated on plan only: the owner can flip to
 * Mapbox and back without saving, so the live preview needs a token before
 * `map_library` has ever been persisted.
 */
export function getMapboxTokenForCustomize(user_plan) {
    if (!canUseMapbox(user_plan)) return '';
    return getMapboxToken();
}
