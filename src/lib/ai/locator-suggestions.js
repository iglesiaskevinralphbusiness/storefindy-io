// The sentences the widget offers under "Try asking:", and the ones it offers
// back when a search returns nothing.
//
// Every sentence is built from the locator's OWN data — its filters, the city a
// real location sits in, its configured radius — so a shopper is never invited
// to ask for something the merchant doesn't have. And every template is written
// in the same vocabulary ./locator-prompt.js can read back, in each of the
// widget's languages, so a chip is always a prompt that works.

/** Fill {placeholders} in a label template. */
export function fillTemplate(template, values = {}) {
    return String(template ?? '').replace(/\{(\w+)\}/g, (match, key) =>
        (values[key] === undefined || values[key] === null ? match : String(values[key])));
}

/**
 * Context shared by both builders.
 *
 * @typedef {object} SuggestionContext
 * @property {object} labels From getLocatorLabels(default_language).
 * @property {string[]} [filters] The locator's own filter labels.
 * @property {string} [place] A city the merchant actually has locations in,
 *   falling back to the locator's default country.
 * @property {number} [radius] The locator's configured search radius.
 * @property {'mi'|'km'} [unit] The locator's distance unit.
 * @property {string} [name] A real location name, for the "named" example.
 */

/**
 * The starter prompts shown under the AI box.
 *
 * Entries that need data the locator doesn't have are dropped rather than shown
 * with an empty slot: no filters configured means no "with Free WiFi" chip, and
 * no known city means no "in Manila" chip.
 *
 * @param {SuggestionContext} context
 * @param {number} [limit] How many to return.
 * @returns {Array<{key: string, prompt: string}>}
 */
export function buildPromptSuggestions(context, limit = 6) {
    const { labels, filters = [], place = '', radius = 10, unit = 'mi', name = '' } = context;
    const values = { filter: filters[0], place, radius, unit, name };

    const candidates = [
        ['sugNearMe', true],
        ['sugOpenNow', true],
        ['sugFilterNearMe', !!filters.length],
        ['sugOpen24In', !!place],
        ['sugClosedIn', !!place],
        ['sugDaylightIn', !!place],
        ['sugNightIn', !!place],
        ['sugRadiusNearMe', Number(radius) > 0],
        ['sugOpen24NearMe', true],
        ['sugNamed', !!name],
    ];

    return candidates
        .filter(([key, usable]) => usable && labels[key])
        .map(([key]) => ({ key, prompt: fillTemplate(labels[key], values) }))
        .slice(0, limit);
}

/**
 * What to offer after a search came back empty.
 *
 * `blocked` names the one condition that, dropped on its own, would have
 * produced an answer (see lib/ai/locator-search.js), so the alternatives are
 * the same question with that condition loosened — a wider radius, the same
 * city without the opening-hours filter, the same area without the amenity.
 *
 * @param {SuggestionContext} context
 * @param {string|null} blocked
 * @returns {Array<{key: string, prompt: string}>}
 */
export function buildRecoverySuggestions(context, blocked) {
    const { labels, filters = [], place = '', radius = 10, unit = 'mi', name = '' } = context;
    const values = { filter: filters[0], place, radius, unit, name };
    // A distance that was too tight is only worth re-offering wider.
    const wider = { ...values, radius: Math.max(Number(radius) || 10, 10) * 5 };

    const byBlocker = {
        // There are locations, they just aren't open then — so drop the clock.
        schedule: [['sugAllIn', !!place], ['sugNearMe', true], ['sugOpenNow', true]],
        // Nothing close enough — widen the circle, or stop using one.
        distance: [['sugRadiusNearMe', true, wider], ['sugAllIn', !!place], ['sugNearMe', true]],
        // The amenity is what emptied it — same area, no amenity.
        filters: [['sugAllIn', !!place], ['sugNearMe', true], ['sugOpenNow', true]],
        // The place didn't resolve — fall back to the shopper's own position.
        place: [['sugNearMe', true], ['sugOpenNow', true], ['sugAllIn', !!place]],
        // No store by that name — show what there is instead.
        name: [['sugAllIn', !!place], ['sugNearMe', true], ['sugFilterNearMe', !!filters.length]],
    };

    const chosen = byBlocker[blocked] || [['sugNearMe', true], ['sugOpenNow', true], ['sugAllIn', !!place]];

    const seen = new Set();
    return chosen
        .filter(([key, usable]) => usable && labels[key] && !seen.has(key) && seen.add(key) !== false)
        .map(([key, , override]) => ({ key, prompt: fillTemplate(labels[key], override || values) }))
        .slice(0, 3);
}
