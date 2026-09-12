// Response shaping for the REST API under /api/v1.
//
// The dashboard needs the full locator document — the customize screen renders
// from `settings` and the widget feature flags, and the analytics screen reads
// the per-day `views` array. None of that is useful over the API, so it is
// stripped here rather than in the shared query, which both callers use.

// Widget rendering config, raw analytics rows, and Mongo internals.
const HIDDEN_LOCATOR_FIELDS = [
    // default map view
    'default_country',
    // NOTE: the search settings — `default_zoom_level`, `distance_unit`,
    // `search_radius` and `maximum_results_shown` — are deliberately NOT hidden.
    //
    // They used to be, which forced any API client that edits a locator to keep
    // its own copy of what it last wrote: the values were writable but not
    // readable, so a form had nothing to prefill from. The WordPress plugin does
    // exactly that (`SF_SL_Api::mirrored_fields()`), and a mirror can only ever
    // be as fresh as the last write it saw. Once the customize sidebar started
    // editing these four as well, a merchant could change the radius there and
    // have the plugin's next save silently put the old one back.
    //
    // Hiding them was never buying anything either: /api/get-locator returns the
    // whole locator document to the unauthenticated widget, so these values are
    // already public to anyone holding a locator ID. They are read-back now so a
    // client can prefill from the source of truth instead of from a guess.
    //
    // `filters` is not hidden for a related reason. It is the locator's own list
    // of categories, and a location's `filters` may only contain values from it —
    // POST/PUT /locations and the CSV import all drop anything else. Without it
    // in the response a client (the WordPress plugin's import wizard, say) has no
    // way to know which values it is allowed to send.
    //
    // The widget feature flags below stay hidden: they have the same staleness
    // problem, but the plugin reads booleans from its mirror without consulting
    // the API at all, so un-hiding them would change nothing until that client
    // is updated too.
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
    'search_method',
    'focused_zoom',
    'dynamic_search',
    'map_style',
    'map_library',
    'mapbox_style_source',
    'mapbox_style',
    'mapbox_custom_json',
    'mapbox_3d',
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

/**
 * Settings groups that were added after locators had already been saved.
 *
 * Those documents carry no value for the new group at all, and the customize PUT
 * requires every group to be present — so a merchant opening an older locator in
 * the WordPress panel and pressing Save would be told "searchAi settings are
 * required" for a panel they never touched. Filling the group in on the way out
 * keeps the read/write round trip whole, and hands the same defaults the schema
 * gives a new locator.
 */
const SETTINGS_DEFAULTS = {
    searchAi: {
        ai_placeholder: 'What are you looking for?',
        ai_border_color: '#e3dafd',
        ai_background_start: '#f4f0ff',
        ai_background_end: '#ffffff',
    },
};

function withSettingsDefaults(settings) {
    const out = { ...(settings || {}) };
    for (const [group, defaults] of Object.entries(SETTINGS_DEFAULTS)) {
        out[group] = { ...defaults, ...(out[group] || {}) };
    }
    return out;
}

/** Customize read/write shape — settings, feature flags, and plan gating fields. */
export function toPublicLocatorCustomize(locator) {
    if (!locator || typeof locator !== 'object') return locator;

    const {
        _id,
        name,
        user_plan,
        status,
        settings,
        show_map_radius_indicator,
        show_map_pin_number,
        form_style,
        search_method,
        focused_zoom,
        dynamic_search,
        map_style,
        map_library,
        mapbox_style_source,
        mapbox_style,
        mapbox_custom_json,
        mapbox_3d,
        show_search_bar,
        detect_location,
        show_filters,
        show_radius,
        show_store_list,
        show_directions,
        show_store_hours,
        powered_by_storefindy,
    } = locator;

    return {
        _id,
        name,
        user_plan,
        status,
        settings: withSettingsDefaults(settings),
        features: {
            show_map_radius_indicator,
            show_map_pin_number,
            form_style,
            // Absent on locators saved before the setting existed; an empty
            // value is the "offer both search forms" default.
            search_method: search_method ?? '',
            focused_zoom,
            dynamic_search,
            map_style: map_style ?? '',
            map_library: map_library ?? '',
            mapbox_style_source: mapbox_style_source ?? '',
            mapbox_style: mapbox_style ?? '',
            mapbox_custom_json: mapbox_custom_json ?? '',
            mapbox_3d: mapbox_3d === true,
            show_search_bar,
            detect_location,
            show_filters,
            show_radius,
            show_store_list,
            show_directions,
            show_store_hours,
            powered_by_storefindy,
        },
    };
}
