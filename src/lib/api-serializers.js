// Response shaping for the REST API under /api/v1.
//
// The dashboard needs the full locator document — the customize screen renders
// from `settings` and the widget feature flags, and the analytics screen reads
// the per-day `views` array. None of that is useful over the API, so it is
// stripped here rather than in the shared query, which both callers use.

// Widget rendering config, raw analytics rows, and Mongo internals.
const HIDDEN_LOCATOR_FIELDS = [
    // default map view and search behaviour
    'default_country',
    'default_zoom_level',
    'search_radius',
    'maximum_results_shown',
    'filters',
    // widget features
    'show_search_bar',
    'detect_location',
    'show_filters',
    'show_radius',
    'show_store_list',
    'show_directions',
    'show_store_hours',
    'powered_by_storefindy',
    // customize settings
    'show_map_radius_indicator',
    'show_map_pin_number',
    'form_style',
    'focused_zoom',
    'dynamic_search',
    'map_style',
    'settings',
    // analytics detail — `views_count` is kept as the summary figure
    'views',
    // internals
    '__v',
    'locatorId', // aggregation artifact from queryLocators()
];

// GET /api/v1/locators/:id hides one field the other locator endpoints keep.
const HIDDEN_LOCATOR_DETAIL_FIELDS = [...HIDDEN_LOCATOR_FIELDS, 'user_id'];

function omit(source, fields) {
    if (!source || typeof source !== 'object') return source;

    const out = { ...source };
    for (const field of fields) delete out[field];
    return out;
}

/**
 * Strip internal and widget-only fields from a locator before returning it.
 * Used by GET /locators, POST /locators and PUT /locators/:id.
 * Accepts a single locator or an array of them; null/undefined passes through.
 */
export function toPublicLocator(locator) {
    if (Array.isArray(locator)) return locator.map(toPublicLocator);
    return omit(locator, HIDDEN_LOCATOR_FIELDS);
}

/**
 * Single-locator read shape — as toPublicLocator(), but `user_id` is dropped
 * too. Only GET /locators/:id uses this.
 */
export function toPublicLocatorDetail(locator) {
    return omit(locator, HIDDEN_LOCATOR_DETAIL_FIELDS);
}
