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
import {
    DAYLIGHT_WINDOW,
    NIGHT_WINDOW,
    isOpen24On,
    isOpenAt,
    isOpenDuringWindow,
    isOpenOnDay,
    isTradingClosed,
    upcomingDates,
} from '@/lib/locator-hours';

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

/** Does the location satisfy everything the prompt said about opening times? */
function scheduleMatches(location, intent, clock) {
    if (!intent.hasSchedule) return true;

    const dates = upcomingDates(clock);
    const explicitDays = intent.days.length
        ? intent.days
        : intent.tomorrow
            ? [(clock.dayIndex + 1) % 7]
            : intent.today
                ? [clock.dayIndex]
                : [];
    // With no day named, every question is about today — "open 24 hours",
    // "open at night" and "open 9 to 5" all mean today unless told otherwise.
    const days = explicitDays.length ? explicitDays : [clock.dayIndex];

    // A location the merchant flagged as temporarily closed or coming soon is
    // never "open", and is always an answer to "which ones are closed".
    if (isTradingClosed(location)) return !!intent.closed;

    if (intent.open24) {
        const open = days.every((day) => isOpen24On(location, dates[day], day));
        return intent.closed ? !open : open;
    }

    const window = intent.night ? NIGHT_WINDOW : intent.daylight ? DAYLIGHT_WINDOW : intent.window;
    if (window) {
        const open = days.every((day) => isOpenDuringWindow(location, dates[day], day, window));
        return intent.closed ? !open : open;
    }

    if (explicitDays.length) {
        const open = explicitDays.every((day) => isOpenOnDay(location, dates[day], day));
        return intent.closed ? !open : open;
    }

    if (intent.openNow) return isOpenAt(location, clock);
    if (intent.closed) return !isOpenAt(location, clock);
    return true;
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
                // A named place is satisfied EITHER by the words lining up with
                // the stored address (which needs no geocoder and works in every
                // script) OR by the location sitting inside the box the geocoder
                // drew — which is what catches "near the Eiffel Tower".
                place: !wantsText || score > 0 || insideBounds(location, bounds),
                name: nameMatches(location, intent),
                filters: filtersMatch(location, intent),
                schedule: scheduleMatches(location, intent, clock),
                distance: !wantsDistance || (distance !== null && distance <= radiusMiles),
            },
        };
    });

    // The order conditions are reported in when several are to blame: the one
    // the shopper is most likely to want relaxed comes first.
    const KEYS = ['schedule', 'distance', 'filters', 'place', 'name'];
    const active = {
        place: wantsText,
        name: !!intent.name,
        filters: intent.filters.length > 0,
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
        if (!blocked) blocked = ['name', 'place', 'filters', 'schedule', 'distance'].find((key) => active[key]) || null;
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
