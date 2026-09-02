// Mapbox is the locator's second, opt-in map library (`map_library: 'mapbox'`).
// An empty `map_library` keeps the original Leaflet / OpenStreetMap renderer and
// its `map_style` tile presets (see ./map-styles.js), so every locator saved
// before this setting existed renders exactly as it did.
//
// Unlike the Leaflet styles — which are all free and keyless — Mapbox needs an
// access token, so it is gated to the Business plan and the token is injected
// server-side per locator rather than baked into the public widget bundle.
//
// Two ways to pick a Mapbox look, mirrored by `mapbox_style_source`:
//   'template' -> one of MAPBOX_STYLE_OPTIONS below (a mapbox:// style URL)
//   'custom'   -> a Mapbox Style Specification document pasted as JSON
// Anything unset/unrecognised falls back to the Standard template.

export const MAP_LIBRARY_DEFAULT = '';
export const MAP_LIBRARY_MAPBOX = 'mapbox';

export const MAPBOX_SOURCE_TEMPLATE = 'template';
export const MAPBOX_SOURCE_CUSTOM = 'custom';

// Mapbox's own published styles. These are the style URLs Mapbox documents as
// stable; each renders through mapbox-gl's vector pipeline.
export const DEFAULT_MAPBOX_STYLE = 'mapbox://styles/mapbox/standard';

const STANDARD_URL = 'mapbox://styles/mapbox/standard';

// Mapbox Standard is a single style with runtime "config" knobs rather than a
// family of separate URLs, so its colour variants are generated from those
// knobs instead of hard-coded as more styles. The two that change the whole
// palette are `lightPreset` (time of day) and `theme` (contrast/saturation).
//
// Values verified against the style's own schema — GET
// /styles/v1/mapbox/standard returns `schema.lightPreset.values` =
// dawn|day|dusk|night and `schema.theme.values` = default|faded|monochrome|custom.
// `custom` is deliberately not offered: it renders nothing without an
// accompanying `theme-data` LUT, which is what the Customize JSON option is for.
const STANDARD_DEFAULTS = { lightPreset: 'day', theme: 'default' };

/**
 * Build one Standard variant.
 *
 * `config` always carries the full set of knobs we manage, so applying a
 * variant is idempotent: switching from "Monochrome Night" back to "Dawn" resets
 * `theme` rather than leaving the previous value behind.
 *
 * The `code` — the value stored on the locator — is the style URL plus only the
 * knobs that differ from Mapbox's own defaults. That keeps "Standard (Default)"
 * on the bare URL it has always been saved as, gives every variant a stable,
 * self-describing id, and means anything that only understands style URLs can
 * still strip the query and render the base style.
 */
function standardVariant(label, overrides = {}) {
    const changed = Object.keys(overrides)
        .filter((key) => overrides[key] !== STANDARD_DEFAULTS[key])
        .sort();
    const query = changed.map((key) => `${key}=${overrides[key]}`).join('&');

    return {
        code: query ? `${STANDARD_URL}?${query}` : STANDARD_URL,
        label,
        url: STANDARD_URL,
        config: { ...STANDARD_DEFAULTS, ...overrides },
    };
}

// The camera tilt the 3D option applies. Enough to give extruded buildings
// depth without laying the map so flat that distant pins pile up on the horizon.
export const MAPBOX_3D_PITCH = 45;
// Ceiling on how far a visitor may tilt once 3D is on. 0 when it is off, which
// is what actually guarantees a flat map — disabling the drag/touch handlers
// alone still leaves keyboard tilt available.
export const MAPBOX_3D_MAX_PITCH = 70;

// A published style that takes no config; `code` is the URL itself.
function publishedStyle(url, label) {
    return { code: url, label, url, config: null };
}

export const MAPBOX_STYLES = [
    // Standard, and its colour variants.
    standardVariant('Standard (Default)'),
    standardVariant('Standard (Dawn)', { lightPreset: 'dawn' }),
    standardVariant('Standard (Dusk)', { lightPreset: 'dusk' }),
    standardVariant('Standard (Night)', { lightPreset: 'night' }),
    standardVariant('Standard (Faded)', { theme: 'faded' }),
    standardVariant('Standard (Faded Dusk)', { theme: 'faded', lightPreset: 'dusk' }),
    standardVariant('Standard (Faded Night)', { theme: 'faded', lightPreset: 'night' }),
    standardVariant('Standard (Monochrome)', { theme: 'monochrome' }),
    standardVariant('Standard (Monochrome Dusk)', { theme: 'monochrome', lightPreset: 'dusk' }),
    standardVariant('Standard (Monochrome Night)', { theme: 'monochrome', lightPreset: 'night' }),

    // The classic published styles, each its own palette.
    publishedStyle('mapbox://styles/mapbox/streets-v12', 'Streets'),
    publishedStyle('mapbox://styles/mapbox/outdoors-v12', 'Outdoors'),
    publishedStyle('mapbox://styles/mapbox/light-v11', 'Light'),
    publishedStyle('mapbox://styles/mapbox/dark-v11', 'Dark'),
    publishedStyle('mapbox://styles/mapbox/navigation-day-v1', 'Navigation (Day)'),
    publishedStyle('mapbox://styles/mapbox/navigation-night-v1', 'Navigation (Night)'),

    // Imagery-backed styles, kept last — they are a different kind of map.
    publishedStyle('mapbox://styles/mapbox/standard-satellite', 'Standard Satellite'),
    publishedStyle('mapbox://styles/mapbox/satellite-v9', 'Satellite'),
    publishedStyle('mapbox://styles/mapbox/satellite-streets-v12', 'Satellite Streets'),
];

// Option list for the customize sidebar's <SelectField />.
export const MAPBOX_STYLE_OPTIONS = MAPBOX_STYLES.map(({ code, label }) => ({ code, label }));

// A pasted style document is stored as a raw string so an in-progress paste is
// never silently discarded. This is the ceiling we accept — comfortably above a
// full Mapbox Standard style export, well below anything that would bloat the
// locator document.
export const MAPBOX_CUSTOM_JSON_MAX = 200000;

// Mapbox is a paid, tokened provider, so only the Business plan may select it.
export function canUseMapbox(user_plan) {
    return user_plan === 'business';
}

/**
 * Parse a pasted Mapbox Style JSON document.
 *
 * Returns `{ style }` on success and `{ error }` with a human-readable reason
 * otherwise, so the sidebar can show inline feedback and the map can decline to
 * boot on a document mapbox-gl would only throw on. An empty string is not an
 * error — it is simply "nothing pasted yet" — and yields `{ style: null }`.
 */
export function parseMapboxCustomJson(text) {
    const raw = typeof text === 'string' ? text.trim() : '';
    if (!raw) return { style: null };
    if (raw.length > MAPBOX_CUSTOM_JSON_MAX) {
        return { error: `Custom JSON is too large (max ${MAPBOX_CUSTOM_JSON_MAX.toLocaleString()} characters).` };
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { error: 'Custom JSON is not valid JSON.' };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { error: 'Custom JSON must be a Mapbox style object.' };
    }
    // The two members mapbox-gl requires of every style document. Checking them
    // here turns "the map is blank" into a message the user can act on.
    if (!Array.isArray(parsed.layers)) {
        return { error: 'Custom JSON is missing a "layers" array.' };
    }
    if (parsed.version !== 8) {
        return { error: 'Custom JSON must be a Mapbox Style Specification v8 document ("version": 8).' };
    }

    return { style: parsed };
}

/**
 * Normalise a locator's map-library selection against the owner's plan.
 *
 * Mapbox is Business-only, so a locator that still carries a Mapbox selection
 * from a lapsed subscription (or from a plan change) is read back as the default
 * library on the default Leaflet style — the same thing a locator that never
 * touched Mapbox resolves to. Both the customize sidebar and the rendered
 * locator run every selection through here, so the preview, the live widget and
 * the saved document can never disagree about what a non-Business plan gets.
 *
 * Returns the feature subset to render/persist, plus `downgraded` so callers can
 * tell an intentional default apart from a revoked Mapbox selection.
 */
export function resolveMapLibrarySelection(features = {}, user_plan = 'free') {
    const wantsMapbox = features.map_library === MAP_LIBRARY_MAPBOX;
    const allowed = canUseMapbox(user_plan);
    // The one case that rewrites anything: a Mapbox selection on a plan that
    // may no longer have it.
    const downgraded = wantsMapbox && !allowed;
    const isMapbox = wantsMapbox && allowed;

    return {
        map_library: isMapbox ? MAP_LIBRARY_MAPBOX : MAP_LIBRARY_DEFAULT,
        // The Leaflet tile presets are free and keyless, so `map_style` is NOT
        // plan-gated — a Free or Pro locator keeps whichever one it picked. It
        // is reset only by a downgrade, where an empty value is what
        // resolveMapStyle() reads as "Voyager (Default)": exactly what a brand
        // new locator renders.
        map_style: downgraded ? '' : (features.map_style ?? ''),
        // Mapbox's own settings are preserved for an entitled plan even while
        // the default library is selected, so toggling back restores the
        // template or document the owner last had. For anyone else they read
        // back as untouched defaults.
        mapbox_style_source: allowed && features.mapbox_style_source === MAPBOX_SOURCE_CUSTOM
            ? MAPBOX_SOURCE_CUSTOM
            : MAPBOX_SOURCE_TEMPLATE,
        mapbox_style: allowed ? (features.mapbox_style || DEFAULT_MAPBOX_STYLE) : DEFAULT_MAPBOX_STYLE,
        mapbox_custom_json: allowed ? (features.mapbox_custom_json ?? '') : '',
        // Only ever true for a locator actually rendering Mapbox: Leaflet has no
        // 3D mode, so a stored `true` must not leak into the default library.
        mapbox_3d: isMapbox && features.mapbox_3d === true,
        isMapbox,
        downgraded,
    };
}

/** The MAPBOX_STYLES entry a stored `mapbox_style` code names, or null. */
function findMapboxStyle(code) {
    if (typeof code !== 'string' || !code.trim()) return null;
    return MAPBOX_STYLES.find((style) => style.code === code.trim()) ?? null;
}

/**
 * Turn a normalised selection into the `style` value mapbox-gl expects: a
 * mapbox:// URL for a template, or the parsed style object for a pasted
 * document. A custom document that doesn't parse falls back to the default
 * template rather than leaving the visitor staring at a dead map.
 */
export function resolveMapboxStyle(selection = {}) {
    if (selection.mapbox_style_source === MAPBOX_SOURCE_CUSTOM) {
        const { style } = parseMapboxCustomJson(selection.mapbox_custom_json);
        if (style) return style;
        return DEFAULT_MAPBOX_STYLE;
    }

    const code = typeof selection.mapbox_style === 'string' ? selection.mapbox_style.trim() : '';
    const entry = findMapboxStyle(code);
    if (entry) return entry.url;
    // An unrecognised code still yields a usable map: variant codes are the
    // style URL plus a query string, so dropping the query leaves the base
    // style. Anything that isn't a mapbox:// URL falls back to the default.
    if (code.startsWith('mapbox://')) return code.split('?')[0];
    return DEFAULT_MAPBOX_STYLE;
}

/**
 * The Standard config a selection asks for — `lightPreset` / `theme`, the knobs
 * that give Standard its colour variants — keyed the way mapbox-gl wants it.
 *
 * Returns null for anything that takes no config: the classic published styles
 * and pasted documents. Note this is *runtime* configuration rather than part of
 * the style URL, which is why several options share one URL and why switching
 * between them applies config instead of reloading the style.
 */
export function resolveMapboxConfig(selection = {}) {
    if (selection.mapbox_style_source === MAPBOX_SOURCE_CUSTOM) return null;
    const entry = findMapboxStyle(selection.mapbox_style);
    if (!entry?.config) return null;

    // Standard ships `show3dObjects` on, which is what the flat map has always
    // rendered (extrusions are simply invisible looking straight down), so the
    // off state deliberately leaves it alone rather than changing today's look.
    // Turning 3D on states it explicitly so a future Standard default can't
    // silently flatten the buildings the option exists to show.
    if (!selection.mapbox_3d) return entry.config;
    return { ...entry.config, show3dObjects: true };
}

// The import id Mapbox Standard exposes its configuration under; the target for
// `new Map({ config })`, `setStyle(url, { config })` and `setConfigProperty`.
export const MAPBOX_CONFIG_IMPORT_ID = 'basemap';
