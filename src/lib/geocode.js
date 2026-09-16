/*
 * Place lookup for the public locator searches.
 *
 * WHY THE COUNTRY IS A BIAS, NOT A FILTER
 * ---------------------------------------
 * The search box's autocomplete (components/Locator/SearchSuggest.js) queries
 * Photon world-wide and hands back exact coordinates, so picking "Bayambang,
 * Pangasinan, Philippines" from the dropdown always moves the map there —
 * whatever the country dropdown happens to say. Typing the SAME words and
 * pressing Search used to go through a Nominatim lookup pinned with
 * `countrycodes`, which answers `[]` for any place outside the selected country
 * and left the widget with no centre to move to. The two paths disagreed about
 * a place the shopper could see in the dropdown a moment earlier.
 *
 * So the country is applied as a first pass only: it still decides which
 * "Springfield" wins when the name is ambiguous, but when it matches nothing at
 * all the lookup is retried world-wide rather than reported as a dead end.
 *
 * WHY A COUNTRY NAME SKIPS THE BIAS ENTIRELY
 * ------------------------------------------
 * The retry only helps when the biased pass finds NOTHING, and for a country
 * name it always finds something wrong. The United States contains towns called
 * China (Texas), Canada (Kentucky), Japan (Missouri) and Australia (Colorado),
 * so "move the map to china" on a US-default locator answered with China, Texas
 * — a confident, plausible, completely wrong result that also stopped the
 * world-wide retry from ever running. A country is never the thing the country
 * dropdown is there to disambiguate, so it is looked up world-wide from the
 * start.
 */

import { countryFromPhrase } from '@/lib/ai/place-resolver';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// One Nominatim pass. `country` is an ISO code, or '' for a world-wide lookup.
async function lookup(query, country) {
    const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '1',
        addressdetails: '1', // request structured address parts (city/state/country)
    });
    if (country) params.set('countrycodes', country);
    try {
        const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
            headers: { 'User-Agent': 'StoreFindy-Locator/1.0' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return null;

        const first = data[0];
        const addr = first.address || {};
        // [south, north, west, east] as strings.
        const box = (first.boundingbox || []).map(Number);
        return {
            lat: parseFloat(first.lat),
            lng: parseFloat(first.lon),
            label: first.display_name || '',
            bounds: box.length === 4 && box.every(Number.isFinite)
                ? { south: box[0], north: box[1], west: box[2], east: box[3] }
                : null,
            // city falls back through town/village/municipality;
            // province falls back through state/region
            city_province:
                addr.city || addr.town || addr.village ||
                addr.municipality || addr.state || addr.region || '',
            country: addr.country || '',
        };
    } catch {
        return null;
    }
}

/**
 * Resolve a free-text "city, state, or postal code" query into a point (plus the
 * box around it, and the structured address the analytics writes record).
 *
 * Returns null only when the query names nowhere on earth.
 */
export async function geocodePlace(query, country) {
    const text = String(query ?? '').trim();
    if (!text) return null;

    // A country names itself. Looked up by its canonical English name, so
    // "u.s.a.", "cn" and "country china" all reach Nominatim as something it
    // recognises, and never through the bias that would trap them in a US town
    // of the same name.
    const named = countryFromPhrase(text);
    if (named) {
        const worldwide = await lookup(named.label, '');
        if (worldwide) return worldwide;

        // Nominatim unreachable or unhelpful. Every country's coordinates ship
        // with the app, so a pan still goes to the right part of the world.
        return {
            lat: named.lat,
            lng: named.lng,
            label: named.label,
            bounds: null,
            city_province: '',
            country: named.label,
        };
    }

    const code = String(country || '').trim().toLowerCase();
    const biased = code ? await lookup(text, code) : null;
    if (biased) return biased;

    // Nothing in the selected country — fall back to the same world-wide reach
    // the autocomplete dropdown has, so a place the shopper can see suggested is
    // a place the Search button can find.
    return lookup(text, '');
}
