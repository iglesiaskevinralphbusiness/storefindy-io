// Turns a parsed prompt (see ./locator-prompt.js) into an answer over the
// locator's own rows, and — when the answer is empty — works out WHICH of the
// shopper's conditions emptied it.
//
// That second half is the point. "No locations found" is a dead end; "there are
// 4 stores in Manila, but none of them are open right now" tells the shopper
// what to change, and lets the widget offer the fixed sentence as a button.
//
// Pure and synchronous: geocoding and the database round trip happen in the
// route, so this can be reasoned about (and tested) on a plain array.

import { COUNTRIES } from '@/utils/constant/countries';
import { normalizePromptText } from './locator-prompt';
// The schedule matcher lives in ./schedule-filter.js so the dashboard's
// Locations page answers "open on saturday and sunday" with the same function
// this does, rather than a second implementation kept in step by hand.
import { matchesSchedule } from './schedule-filter';
// The same address reader the dashboard's Locations page uses, so a shopper
// who misspells a town or writes "California, United States" gets the answer a
// merchant searching their own list would.
import { buildPlaceIndex, resolveAddress, PLACE_FIELDS, normalizePlace } from './place-resolver';

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance in miles — the same maths the address search uses. */
export function distanceInMiles(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_MILES * 2 * Math.asin(Math.sqrt(a));
}

/**
 * The searchable text of one location, field by field, so a match can say where
 * it came from. `custom_notes` is in here deliberately: merchants use it for the
 * things no column covers ("inside the food court", "drive-through only"), and a
 * shopper asking for exactly that should find it.
 */
function searchableFields(location) {
    const country = String(location.country || '').toLowerCase();
    const countryLabel = COUNTRIES.find((entry) => entry.code === country)?.label || '';
    return {
        name: normalizePromptText(location.name),
        city: normalizePromptText(location.city),
        state: normalizePromptText(location.state),
        postal: normalizePromptText(location.postal),
        street: normalizePromptText(location.street),
        country: `${country} ${normalizePromptText(countryLabel)}`.trim(),
        filters: normalizePromptText((location.filters || []).join(' ')),
        notes: normalizePromptText(location.custom_notes),
        description: normalizePromptText(location.description),
    };
}

/** How much each field is worth when ranking two text matches against each other. */
const FIELD_WEIGHT = {
    name: 6, city: 5, state: 4, postal: 4, country: 3, street: 3, filters: 2, notes: 2, description: 1,
};

/**
 * Score one location against the shopper's leftover words.
 *
 * Matching runs in BOTH directions on purpose. Token-in-field ("manila" inside
 * "Manila City") is what works for languages written with spaces; field-in-text
 * (the stored "東京" appearing anywhere in what was typed) is what works for the
 * ones that aren't, where the prompt cannot be split into words at all.
 */
function textScore(fields, intent) {
    const leftover = intent.leftoverText || '';
    let score = 0;
    const matched = new Set();

    for (const [key, value] of Object.entries(fields)) {
        if (!value) continue;
        const weight = FIELD_WEIGHT[key] || 1;

        for (const keyword of intent.keywords) {
            if (value.includes(keyword)) {
                score += weight;
                matched.add(key);
            }
        }
        // The stored value read back out of the sentence. Guarded at 2
        // characters so a one-letter state code cannot match everything.
        if (value.length >= 2 && leftover.includes(value)) {
            score += weight;
            matched.add(key);
        }
    }

    return { score, matched: [...matched] };
}

/**
 * The merchant-set trading state, matched exactly.
 *
 * Exactly, and never through isTradingClosed(): "coming soon" and "temporarily
 * closed" are both "not trading", but a shopper who asks for one does not want
 * the other. A location with no stored state is treated as open, which is what
 * the import and the location form both default to.
 */
function statusMatches(location, intent) {
    if (!intent.locationStatus) return true;
    return String(location.location_status || 'open') === intent.locationStatus;
}

/** A store name the shopper spelled out, matched loosely in both directions. */
function nameMatches(location, intent) {
    if (!intent.name) return true;
    const wanted = normalizePromptText(intent.name);
    const actual = normalizePromptText(location.name);
    if (!wanted) return true;
    return actual.includes(wanted) || wanted.includes(actual);
}

/** Every amenity the shopper asked for has to be on the location. */
function filtersMatch(location, intent) {
    if (!intent.filters.length) return true;
    const owned = (location.filters || []).map((value) => normalizePromptText(value));
    return intent.filters.every((filter) => owned.includes(normalizePromptText(filter)));
}

/**
 * The locator's own address values, as a resolver index.
 *
 * Built from the rows already in memory — this is the same idea as the
 * dashboard's vocabulary query, except the rows are right here, so there is
 * nothing to fetch.
 */
function placeIndexFor(locations) {
    const columns = {};
    for (const field of PLACE_FIELDS) columns[field] = [];
    for (const location of locations) {
        for (const field of PLACE_FIELDS) {
            const value = String(location[field] ?? '').trim();
            if (value) columns[field].push(value);
        }
    }
    return buildPlaceIndex(columns);
}

/**
 * The address the shopper wrote, read two ways.
 *
 * The raw leftover first, because word order and articles matter to a place
 * name — "los angeles" is one city and `keywords` would have dropped "los".
 * Then the cleaned keywords, because Japanese, Chinese and Korean have no
 * spaces: the whole sentence arrives as one token that no window can split,
 * and only `keywords` has had the particles taken out character by character.
 */
function resolvePlaceWords(intent, index) {
    const direct = resolveAddress(intent.leftoverText, index);
    if (direct.matches.length) return direct.matches;
    return resolveAddress(intent.keywords.join(' '), index).matches;
}

/**
 * Does the location sit at the address the shopper described?
 *
 * Every part that resolved has to hold: "bayambang pangasinan" is one place,
 * not two alternatives. Returns null when nothing resolved, so the caller can
 * tell "no address was named" from "an address was named and this isn't it".
 */
function matchesResolvedPlace(location, resolved) {
    if (!resolved.length) return null;
    return resolved.every((match) => normalizePlace(location[match.field]) === normalizePlace(match.value));
}

/** Fields that are somewhere, as opposed to something. */
const ADDRESS_FIELDS = new Set(['city', 'state', 'country', 'postal', 'street']);

/**
 * Did the shopper name this location's place?
 *
 * When the words resolved to an address this locator really has, that address
 * IS the question and every part of it has to hold — "Bayambang, Pangasinan"
 * means the branch in Bayambang, not every branch in the province. Scoring is
 * too loose to decide that on its own: one keyword landing in one field is
 * enough for it, and "pangasinan" lands in the province of every branch there.
 *
 * A location that fails the resolved address is still rescued by matching on
 * something that is NOT an address — its name, its notes, its description, an
 * amenity. That is what keeps "california pizza" finding the store of that name
 * in a locator that also trades in California.
 *
 * With nothing resolved, scoring decides as it always has, which is what
 * answers a search through the merchant's own notes.
 */
function placeMatches(location, { wantsText, resolved, score, matched, bounds }) {
    if (!wantsText) return true;
    if (insideBounds(location, bounds)) return true;

    const atResolvedPlace = matchesResolvedPlace(location, resolved);
    if (atResolvedPlace === null) return score > 0;
    if (atResolvedPlace) return true;

    return matched.some((field) => !ADDRESS_FIELDS.has(field));
}

/** Inside the box a geocoder drew around the place that was named. */
function insideBounds(location, bounds) {
    if (!bounds) return false;
    return (
        location.latitude >= bounds.south && location.latitude <= bounds.north &&
        location.longitude >= bounds.west && location.longitude <= bounds.east
    );
}

/**
 * Answer a parsed prompt over one locator's locations.
 *
 * @param {object[]} locations Every published, in-plan location of the locator.
 * @param {object} intent From parseLocatorPrompt().
 * @param {object} context
 * @param {{dayIndex:number, minutes:number, date:string}} context.clock The
 *   VISITOR's clock — opening hours are read at face value against it, exactly
 *   as the widget's own open/closed badge does.
 * @param {{lat:number, lng:number}|null} context.center Where "near me" is, or
 *   the geocoded place.
 * @param {number|null} context.radiusMiles Distance limit around that center.
 * @param {object|null} context.bounds Geocoded bounding box for a named place.
 * @returns {{results: object[], blocked: string|null, counts: object}}
 */
export function applyLocatorIntent(locations, intent, context = {}) {
    const { clock, center = null, radiusMiles = null, bounds = null } = context;

    // Only the words that survived the phrase book count as "the shopper named
    // a place". The raw leftover still holds scaffolding ("show me stores"),
    // which would otherwise make every prompt look like a place search.
    const wantsText = intent.keywords.length > 0;
    const wantsDistance = !!center && Number.isFinite(radiusMiles) && radiusMiles > 0 && (intent.nearMe || !!intent.radius);

    // What the shopper wrote, read against the addresses this locator really
    // has. Case, accents, punctuation, country codes and ordinary misspellings
    // all come out in the wash — see lib/ai/place-resolver.js.
    const resolved = wantsText ? resolvePlaceWords(intent, placeIndexFor(locations)) : [];

    const rows = locations.map((location) => {
        const fields = searchableFields(location);
        const { score, matched } = wantsText ? textScore(fields, intent) : { score: 0, matched: [] };
        const distance = center && typeof location.latitude === 'number' && typeof location.longitude === 'number'
            ? distanceInMiles(center.lat, center.lng, location.latitude, location.longitude)
            : null;

        return {
            location,
            score,
            matched,
            distance,
            pass: {
                place: placeMatches(location, { wantsText, resolved, score, matched, bounds }),
                name: nameMatches(location, intent),
                status: statusMatches(location, intent),
                filters: filtersMatch(location, intent),
                schedule: matchesSchedule(location, intent, clock),
                distance: !wantsDistance || (distance !== null && distance <= radiusMiles),
            },
        };
    });

    // The order conditions are reported in when several are to blame: the one
    // the shopper is most likely to want relaxed comes first.
    const KEYS = ['schedule', 'distance', 'filters', 'status', 'place', 'name'];
    const active = {
        place: wantsText,
        name: !!intent.name,
        filters: intent.filters.length > 0,
        status: !!intent.locationStatus,
        schedule: intent.hasSchedule,
        distance: wantsDistance,
    };

    const passesAll = (row, skip) => KEYS.every((key) => key === skip || row.pass[key]);
    const matching = rows.filter((row) => passesAll(row, null));

    const counts = {};
    for (const key of KEYS) counts[key] = rows.filter((row) => row.pass[key]).length;

    let blocked = null;
    if (!matching.length) {
        // Which single condition, dropped on its own, would have produced an
        // answer? That is the one worth naming and offering to relax.
        for (const key of KEYS) {
            if (!active[key]) continue;
            if (rows.some((row) => passesAll(row, key))) {
                blocked = key;
                break;
            }
        }
        // Nothing is rescued by dropping one condition, so name the narrowest
        // one the shopper actually asked for.
        if (!blocked) blocked = ['name', 'place', 'status', 'filters', 'schedule', 'distance'].find((key) => active[key]) || null;
    }

    const results = matching
        .sort((a, b) => {
            // Distance first whenever there is a center to measure from —
            // "near me" and "in Manila" both read as nearest-first.
            if (a.distance !== null && b.distance !== null && a.distance !== b.distance) {
                return a.distance - b.distance;
            }
            if (b.score !== a.score) return b.score - a.score;
            return String(a.location.name || '').localeCompare(String(b.location.name || ''));
        })
        .map((row) => ({ ...row.location, ...(row.distance !== null ? { _distanceMiles: row.distance } : {}) }));

    return { results, blocked, counts, active };
}
