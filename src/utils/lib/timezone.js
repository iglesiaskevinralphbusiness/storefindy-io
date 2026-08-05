import tzLookup from 'tz-lookup';

/**
 * IANA timezone (e.g. "America/New_York") for a coordinate pair.
 *
 * The locator widget renders in the visitor's browser, so its open/closed
 * indicator has to reason in the STORE's clock rather than the visitor's — a
 * shopper in Manila looking at a New York store must still see "Closes 5 PM".
 * The lookup is a packed offline dataset, so this costs no network call.
 *
 * Returns '' when the coordinates are unusable; callers treat that as "fall
 * back to visitor-local time".
 */
export function resolveTimezone(latitude, longitude) {
    try {
        return tzLookup(latitude, longitude) || '';
    } catch {
        return '';
    }
}
