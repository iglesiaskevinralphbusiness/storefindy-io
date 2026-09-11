'use client';
// Turns a merchant's sentence into a list of proposed changes to the Customize
// Locator settings — and, just as importantly, refuses to touch anything else.
//
// THE SAFETY MODEL
// The AI never produces a setting name and never produces a value. It does one
// thing: rank the merchant's words against a fixed catalogue of the settings the
// sidebar already renders (SETTING_CATALOGUE below), so it can say *which*
// control the sentence is about. The value comes from deterministic extraction
// of what the merchant literally typed — a hex code, a number, a polarity word,
// an option label — and is then validated against that setting's own type and
// option list with Zod. A proposal that fails validation is dropped, never
// coerced.
//
// Two consequences worth stating outright:
//   • A sentence can only change settings it actually names. "Make it dark"
//     resolves to the dark-theme recipe's colour fields and nothing else; the
//     map settings, marker settings, search settings and layout it never
//     mentioned are not in the returned change list, so applyConfigChanges()
//     cannot alter them.
//   • Nothing is applied automatically. interpretConfigRequest() returns a diff
//     for the merchant to read; applying it is a setState in the sidebar, and
//     saving it is still the merchant pressing Save Changes.
import { z } from 'zod';
import { MAP_STYLE_OPTIONS } from '@/utils/constant/map-styles';
import { MAXIMUM_RESULTS_SHOWN, ZOOM_LEVELS } from '@/utils/constant';
import { DISTANCE_UNITS, getSearchRadiiValues, convertDistance } from '@/utils/distance';
import { embedTexts } from './worker-client';
import { rank } from './vector';

/* --------------------------------------------------------------------- *
 * Option lists, mirrored from the sidebar
 * ------------------------------------------------------------------ */

const HEIGHTS = ['small', 'medium', 'large'];
const BORDERS = ['rounded', 'pill', 'square'];
const WRAPPER_BORDERS = ['none', ...BORDERS];
const PIN_TYPES = ['standard', 'custom'];
const PIN_SIZES = ['small', 'medium', 'large'];
const FORM_STYLES = ['style-1', 'style-2', 'style-3'];
const FONT_FAMILIES = [
    'system-ui, sans-serif', 'Arial, sans-serif', 'Helvetica, sans-serif',
    'Georgia, serif', "'Times New Roman', serif", "'Courier New', monospace",
    'Roboto, sans-serif', 'Poppins, sans-serif',
];
const SEARCH_ICONS = ['', 'magnifying-glass', 'magnifying-glass2', 'magnifying-glass3', 'map', 'pin', 'shopping-bag'];
const FILTER_ICONS = ['', 'funnel', 'funnel-solid', 'list-filter', 'filter-circle'];
const ACTION_ICONS = ['', 'map-view', 'pin-view', 'pinned', 'arrow-right', 'arrow-left', 'chevron-left', 'chevron-right', 'circle-chevron-left', 'circle-chevron-right'];
const MAP_STYLE_CODES = MAP_STYLE_OPTIONS.map((option) => option.code);

/* --------------------------------------------------------------------- *
 * The catalogue: every setting the AI is allowed to name
 * ------------------------------------------------------------------ */

/**
 * One entry per control in the customize sidebar.
 *
 *   path    dot path into `{ settings, features }` — the only paths that can
 *           ever be written, which is what stops the model reaching arbitrary
 *           document fields.
 *   type    decides how a value is extracted and validated.
 *   phrases the wordings a merchant might use. Each is embedded and the best
 *           match across all of a setting's phrases wins, so "opening times",
 *           "business hours" and "store hours" all land on show_store_hours.
 *   plan    'business' when the sidebar itself disables the control below that
 *           plan; the proposal is then dropped with a note rather than offered.
 */
export const SETTING_CATALOGUE = [
    // --- Layout & typography ---
    { path: 'settings.height', type: 'enum', options: HEIGHTS, label: 'Widget height', phrases: ['widget height', 'make the locator taller', 'make the map shorter', 'size of the widget'] },
    { path: 'settings.background', type: 'color', label: 'Background colour', phrases: ['the background colour', 'background colour of the widget', 'widget background', 'main background'] },
    { path: 'settings.text_color', type: 'color', label: 'Text colour', phrases: ['text colour', 'font colour', 'colour of the writing'] },
    { path: 'settings.font_family', type: 'enum', options: FONT_FAMILIES, label: 'Font family', phrases: ['font family', 'typeface', 'change the font'] },
    { path: 'settings.font_size', type: 'number', min: 8, max: 40, label: 'Font size', phrases: ['font size', 'text size', 'bigger text', 'smaller text'] },
    { path: 'settings.border', type: 'enum', options: WRAPPER_BORDERS, label: 'Widget border style', phrases: ['border around the widget', 'widget border style', 'rounded corners on the widget'] },
    { path: 'settings.border_color', type: 'color', label: 'Widget border colour', phrases: ['border colour of the widget', 'outline colour'] },

    // --- Search input ---
    { path: 'settings.searchInput.border', type: 'enum', options: BORDERS, label: 'Search box border', phrases: ['search box border', 'shape of the search field'] },
    { path: 'settings.searchInput.background', type: 'color', label: 'Search box background', phrases: ['search box background colour', 'search field background'] },
    { path: 'settings.searchInput.text_color', type: 'color', label: 'Search box text colour', phrases: ['search box text colour', 'colour of what people type'] },
    { path: 'settings.searchInput.border_color', type: 'color', label: 'Search box border colour', phrases: ['search box border colour', 'search field outline colour'] },
    { path: 'settings.searchInput.placeholder', type: 'text', label: 'Search box placeholder', phrases: ['search box placeholder text', 'hint text in the search field'] },

    // --- Search button ---
    { path: 'settings.search.border', type: 'enum', options: BORDERS, label: 'Search button border', phrases: ['search button border', 'search button shape'] },
    { path: 'settings.search.background', type: 'color', label: 'Search button colour', phrases: ['search button colour', 'search button background', 'make the search button a different colour'] },
    { path: 'settings.search.text_color', type: 'color', label: 'Search button text colour', phrases: ['search button text colour', 'search button label colour'] },
    { path: 'settings.search.label', type: 'text', label: 'Search button label', phrases: ['the words printed on the search button', 'search button caption text'] },
    { path: 'settings.search.icon', type: 'enum', options: SEARCH_ICONS, label: 'Search button icon', phrases: ['search button icon', 'magnifying glass icon'] },

    // --- Filter button & list ---
    { path: 'settings.filter.border', type: 'enum', options: BORDERS, label: 'Filter button border', phrases: ['filter button border', 'filter button shape'] },
    { path: 'settings.filter.background', type: 'color', label: 'Filter button colour', phrases: ['filter button colour', 'filter button background'] },
    { path: 'settings.filter.text_color', type: 'color', label: 'Filter button text colour', phrases: ['filter button text colour'] },
    { path: 'settings.filter.label', type: 'text', label: 'Filter button label', phrases: ['filter button label', 'wording on the filter button'] },
    { path: 'settings.filter.icon', type: 'enum', options: FILTER_ICONS, label: 'Filter button icon', phrases: ['filter button icon', 'funnel icon'] },
    { path: 'settings.filterList.background', type: 'color', label: 'Filter list background', phrases: ['filter list background colour', 'filter dropdown background'] },
    { path: 'settings.filterList.text_color', type: 'color', label: 'Filter list text colour', phrases: ['filter list text colour'] },
    { path: 'settings.filterList.border_color', type: 'color', label: 'Filter list border colour', phrases: ['filter list border colour'] },
    { path: 'settings.filterList.active_background', type: 'color', label: 'Selected filter background', phrases: ['selected filter background colour', 'active filter highlight'] },
    { path: 'settings.filterList.active_text_color', type: 'color', label: 'Selected filter text colour', phrases: ['selected filter text colour'] },

    // --- Result cards ---
    { path: 'settings.resultItem.background', type: 'color', label: 'Store card background', phrases: ['store card background colour', 'result item background', 'store list background'] },
    { path: 'settings.resultItem.border', type: 'enum', options: BORDERS, label: 'Store card border', phrases: ['store card border', 'result card shape'] },
    { path: 'settings.resultItem.border_color', type: 'color', label: 'Store card border colour', phrases: ['store card border colour', 'result card outline'] },
    { path: 'settings.resultItem.active_background', type: 'color', label: 'Selected store card background', phrases: ['selected store card background colour', 'highlighted result background'] },
    { path: 'settings.resultItem.active_border_color', type: 'color', label: 'Selected store card border colour', phrases: ['selected store card border colour', 'highlighted result outline'] },

    // --- Card buttons ---
    { path: 'settings.getDirections.background', type: 'color', label: 'Directions button colour', phrases: ['get directions button colour', 'directions button background'] },
    { path: 'settings.getDirections.text_color', type: 'color', label: 'Directions button text colour', phrases: ['get directions button text colour'] },
    { path: 'settings.getDirections.border', type: 'enum', options: BORDERS, label: 'Directions button border', phrases: ['get directions button border', 'directions button shape'] },
    { path: 'settings.getDirections.label', type: 'text', label: 'Directions button label', phrases: ['get directions button label', 'wording on the directions button'] },
    { path: 'settings.getDirections.icon', type: 'enum', options: ACTION_ICONS, label: 'Directions button icon', phrases: ['get directions button icon'] },
    { path: 'settings.viewLocation.background', type: 'color', label: 'View location button colour', phrases: ['view location button colour', 'view store button background'] },
    { path: 'settings.viewLocation.text_color', type: 'color', label: 'View location button text colour', phrases: ['view location button text colour'] },
    { path: 'settings.viewLocation.border', type: 'enum', options: BORDERS, label: 'View location button border', phrases: ['view location button border'] },
    { path: 'settings.viewLocation.label', type: 'text', label: 'View location button label', phrases: ['view location button label', 'wording on the view location button'] },
    { path: 'settings.viewLocation.icon', type: 'enum', options: ACTION_ICONS, label: 'View location button icon', phrases: ['view location button icon'] },

    // --- Map pins ---
    { path: 'settings.pin.type', type: 'enum', options: PIN_TYPES, label: 'Pin type', phrases: ['pin type', 'use a custom marker image'] },
    { path: 'settings.pin.color', type: 'color', label: 'Pin colour', phrases: ['pin colour', 'marker colour', 'colour of the map pins'] },
    { path: 'settings.pin.size', type: 'enum', options: PIN_SIZES, label: 'Pin size', phrases: ['pin size', 'marker size', 'bigger map pins'] },
    { path: 'settings.pin.text_color', type: 'color', label: 'Pin number colour', phrases: ['pin number colour', 'colour of the number on the marker'] },
    { path: 'settings.pin.text_size', type: 'number', min: 6, max: 32, label: 'Pin number size', phrases: ['pin number size', 'size of the number on the marker'] },

    // --- Mobile ---
    { path: 'settings.mobileView.background', type: 'color', label: 'Mobile background', phrases: ['background colour on mobile phones', 'phone and tablet view background'] },
    { path: 'settings.mobileView.text_color', type: 'color', label: 'Mobile text colour', phrases: ['text colour on mobile phones', 'phone and tablet view text colour'] },
    { path: 'settings.mobileView.active_background', type: 'color', label: 'Mobile selected background', phrases: ['mobile selected card background'] },
    { path: 'settings.mobileView.active_border_color', type: 'color', label: 'Mobile selected border colour', phrases: ['mobile selected card border colour'] },

    // --- Feature toggles ---
    { path: 'features.show_search_bar', type: 'boolean', label: 'Search bar', phrases: ['the search bar', 'let visitors search by city or postcode'] },
    { path: 'features.detect_location', type: 'boolean', label: 'Detect my location', phrases: ['detect my location button', 'use the visitor current location', 'geolocation button'] },
    { path: 'features.show_filters', type: 'boolean', label: 'Filters', phrases: ['the filters', 'category filters on the form'] },
    { path: 'features.show_radius', type: 'boolean', label: 'Radius selector', phrases: ['the radius dropdown on the form', 'let visitors choose the search distance'] },
    { path: 'features.show_map_radius_indicator', type: 'boolean', label: 'Radius circle on the map', phrases: ['the radius circle drawn on the map', 'radius indicator on the map'] },
    { path: 'features.show_map_pin_number', type: 'boolean', label: 'Numbers on map pins', phrases: ['numbers on the map pins', 'numbered markers'] },
    { path: 'features.dynamic_search', type: 'boolean', label: 'Search as the map moves', phrases: ['search again when the map is dragged', 'update results as the map moves'] },
    { path: 'features.focused_zoom', type: 'boolean', label: 'Zoom in on selection', phrases: ['zoom in when a store is selected', 'focus the map on the chosen store'] },
    { path: 'features.show_store_list', type: 'boolean', label: 'Store list', phrases: ['the store list', 'the list of stores beside the map', 'the results list'] },
    { path: 'features.show_directions', type: 'boolean', label: 'Directions button', phrases: ['the get directions button', 'link to google maps directions'] },
    { path: 'features.show_store_hours', type: 'boolean', label: 'Opening hours on store cards', phrases: ['opening hours on the store cards', 'business hours', 'store hours', 'trading times'] },
    { path: 'features.powered_by_storefindy', type: 'boolean', plan: 'business', label: 'Powered by Storefindy branding', phrases: ['the powered by storefindy branding', 'remove your branding'] },

    // --- Map & form style ---
    { path: 'features.form_style', type: 'enum', options: FORM_STYLES, plan: 'business', label: 'Form style', phrases: ['the form layout style', 'search form template'] },
    { path: 'features.map_style', type: 'enum', options: MAP_STYLE_CODES, optionLabels: MAP_STYLE_OPTIONS, label: 'Map style', phrases: ['the map style', 'satellite map', 'dark map tiles', 'terrain map', 'street map look'] },

    // --- Search & results ---
    { path: 'features.search_radius', type: 'radius', label: 'Search radius', phrases: ['the search radius', 'how far around the visitor to search', 'search distance'] },
    { path: 'features.distance_unit', type: 'enum', options: DISTANCE_UNITS.map((unit) => unit.code), label: 'Distance unit', phrases: ['miles or kilometres', 'the distance unit'] },
    { path: 'features.maximum_results_shown', type: 'choice', options: MAXIMUM_RESULTS_SHOWN.map((option) => Number(option.code)), label: 'Maximum results shown', phrases: ['how many results to show', 'maximum number of stores in the list'] },
    { path: 'features.default_zoom_level', type: 'choice', options: ZOOM_LEVELS.map((option) => Number(option.code)), label: 'Default zoom level', phrases: ['the default zoom level', 'how zoomed in the map starts'] },
];

const BY_PATH = new Map(SETTING_CATALOGUE.map((setting) => [setting.path, setting]));

/**
 * Zod allowlist. `path` is an enum of the catalogue's paths and nothing else,
 * so a change naming any other field — a database column, a nested settings key
 * the sidebar doesn't render — fails validation before it can be applied.
 */
export const configChangeSchema = z.object({
    path: z.enum(SETTING_CATALOGUE.map((setting) => setting.path)),
    value: z.union([z.string(), z.number(), z.boolean()]),
});

export const configProposalSchema = z.object({
    changes: z.array(configChangeSchema).max(SETTING_CATALOGUE.length),
});

/* --------------------------------------------------------------------- *
 * Value extraction — deterministic, from what the merchant actually typed
 * ------------------------------------------------------------------ */

/** Colour words the sidebar's colour pickers can be set to by name. */
const COLOR_WORDS = {
    black: '#000000', white: '#ffffff', red: '#e02424', crimson: '#dc2626',
    orange: '#f97316', amber: '#f59e0b', yellow: '#eab308', lime: '#84cc16',
    green: '#16a34a', emerald: '#10b981', teal: '#14b8a6', cyan: '#06b6d4',
    sky: '#0ea5e9', blue: '#2563eb', navy: '#1e3a8a', indigo: '#4f46e5',
    violet: '#7c3aed', purple: '#9333ea', magenta: '#d946ef', pink: '#ec4899',
    rose: '#f43f5e', brown: '#78350f', beige: '#f5f5dc', cream: '#fdfbf7',
    gray: '#6b7280', grey: '#6b7280', silver: '#c0c0c0', charcoal: '#1f2937',
    slate: '#475569', gold: '#d4af37',
};

const NEGATIVE = /\b(hide|hidden|disable|disabled|remove|turn\s+off|switch\s+off|without|no longer|don'?t\s+show|do\s+not\s+show|stop\s+showing|off)\b/;
const POSITIVE = /\b(show|display|enable|enabled|turn\s+on|switch\s+on|add|with|include|reveal|on)\b/;

/** A boolean from the clause's polarity. Absent polarity reads as "yes, show it". */
function readBoolean(clause) {
    if (NEGATIVE.test(clause)) return false;
    if (POSITIVE.test(clause)) return true;
    return true;
}

/** A hex code, or a colour word. */
function readColor(clause) {
    const hex = /#([0-9a-f]{3}|[0-9a-f]{6})\b/i.exec(clause);
    if (hex) {
        const value = hex[0].toLowerCase();
        // Expand #abc to #aabbcc so the stored value always round-trips through
        // the sidebar's <input type="color">, which only emits 6-digit hex.
        return value.length === 4
            ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
            : value;
    }
    for (const [word, value] of Object.entries(COLOR_WORDS)) {
        if (new RegExp(`\\b${word}\\b`).test(clause)) return value;
    }
    return null;
}

/** The first number in the clause. */
function readNumber(clause) {
    const match = /(-?\d+(?:\.\d+)?)/.exec(clause.replace(/#[0-9a-f]{3,6}\b/gi, ''));
    return match ? Number(match[1]) : null;
}

/** Pick the closest allowed value from a numeric option list. */
function snapToOption(value, options) {
    return options.reduce((best, option) => (
        Math.abs(option - value) < Math.abs(best - value) ? option : best
    ), options[0]);
}

/** Label words too generic to identify an option on their own. */
const ENUM_STOP_WORDS = new Set(['only', 'with', 'from', 'default', 'system', 'none']);

/**
 * Match words in the clause to one of an enum's codes or labels.
 *
 * Three passes, strongest first: the whole label, then the raw code, then the
 * distinctive words of a label ("satellite" for "Satellite Imagery"). All three
 * only ever match text the merchant actually typed — an enum value they didn't
 * mention is never chosen, so "make the border nicer" changes nothing rather
 * than guessing at one.
 */
function readEnum(clause, setting) {
    const options = setting.options ?? [];
    const labelled = setting.optionLabels ?? options.map((code) => ({ code, label: String(code) }));

    // Longest label first, so "Dark Matter (Dark, No Labels)" is preferred over
    // "Dark Matter (Dark)" when the merchant spelled the longer one out.
    const candidates = [...labelled].sort((a, b) => String(b.label).length - String(a.label).length);
    for (const candidate of candidates) {
        const label = String(candidate.label).toLowerCase();
        const bare = label.replace(/\s*\(.*?\)\s*/g, '').trim();
        if (bare && clause.includes(bare)) return candidate.code;
    }
    for (const option of options) {
        const code = String(option).toLowerCase();
        // Codes like `style-2` and `km`; also match "style 2".
        if (code && (clause.includes(code) || clause.includes(code.replace(/[-_.]/g, ' ')))) return option;
    }

    // Partial label match, scored by how much of the label the clause covers,
    // so "use satellite map" finds "Satellite Imagery" without the merchant
    // having to name the tile set exactly. Ties go to the shorter label — the
    // plainer option is the one someone speaking loosely means.
    let best = null;
    for (const candidate of labelled) {
        const words = String(candidate.label).toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((word) => word.length >= 4 && !ENUM_STOP_WORDS.has(word));
        if (words.length === 0) continue;

        const hits = words.filter((word) => new RegExp(`\\b${word}`).test(clause));
        if (hits.length === 0) continue;

        const score = hits.length / words.length;
        if (!best || score > best.score || (score === best.score && String(candidate.label).length < best.length)) {
            best = { code: candidate.code, score, length: String(candidate.label).length };
        }
    }
    return best ? best.code : null;
}

/* --------------------------------------------------------------------- *
 * Recipes — a named look that maps to several colour settings at once
 * ------------------------------------------------------------------ */

/**
 * "Make it dark" is one intent that legitimately spans several controls. Each
 * recipe lists them explicitly: applying one changes exactly these paths and no
 * others, so a dark request still leaves the map settings, marker settings,
 * search settings and layout exactly as they were.
 */
export const RECIPES = [
    {
        id: 'theme-dark',
        label: 'Dark theme',
        phrases: [
            'make it dark', 'dark mode', 'dark theme', 'night mode',
            'make my store locator dark', 'switch to a dark colour scheme',
            'use dark colours everywhere', 'a dark look',
        ],
        changes: {
            'settings.background': '#111827',
            'settings.text_color': '#f9fafb',
            'settings.border_color': '#374151',
            'settings.searchInput.background': '#1f2937',
            'settings.searchInput.text_color': '#f9fafb',
            'settings.searchInput.border_color': '#374151',
            'settings.search.background': '#f9fafb',
            'settings.search.text_color': '#111827',
            'settings.filter.background': '#1f2937',
            'settings.filter.text_color': '#f9fafb',
            'settings.filterList.background': '#1f2937',
            'settings.filterList.text_color': '#f9fafb',
            'settings.filterList.border_color': '#374151',
            'settings.filterList.active_background': '#374151',
            'settings.filterList.active_text_color': '#f9fafb',
            'settings.resultItem.background': '#1f2937',
            'settings.resultItem.border_color': '#374151',
            'settings.resultItem.active_background': '#111827',
            'settings.resultItem.active_border_color': '#60a5fa',
            'settings.getDirections.background': '#f9fafb',
            'settings.getDirections.text_color': '#111827',
            'settings.viewLocation.background': '#374151',
            'settings.viewLocation.text_color': '#f9fafb',
            'settings.mobileView.background': '#111827',
            'settings.mobileView.text_color': '#f9fafb',
            'settings.mobileView.active_background': '#1f2937',
            'settings.mobileView.active_border_color': '#60a5fa',
            'features.map_style': 'CartoDB.DarkMatter',
        },
    },
    {
        id: 'theme-light',
        label: 'Light theme',
        phrases: [
            'make it light', 'light mode', 'light theme', 'bright theme',
            'make my store locator light', 'switch to a light colour scheme',
            'use light colours everywhere', 'a light look',
        ],
        changes: {
            'settings.background': '#ffffff',
            'settings.text_color': '#111827',
            'settings.border_color': '#e5e7eb',
            'settings.searchInput.background': '#ffffff',
            'settings.searchInput.text_color': '#111827',
            'settings.searchInput.border_color': '#d1d5db',
            'settings.search.background': '#111827',
            'settings.search.text_color': '#ffffff',
            'settings.filter.background': '#111827',
            'settings.filter.text_color': '#ffffff',
            'settings.filterList.background': '#ffffff',
            'settings.filterList.text_color': '#111827',
            'settings.filterList.border_color': '#e5e7eb',
            'settings.filterList.active_background': '#f3f4f6',
            'settings.filterList.active_text_color': '#111827',
            'settings.resultItem.background': '#ffffff',
            'settings.resultItem.border_color': '#e5e7eb',
            'settings.resultItem.active_background': '#ffffff',
            'settings.resultItem.active_border_color': '#185FA5',
            'settings.getDirections.background': '#111827',
            'settings.getDirections.text_color': '#ffffff',
            'settings.viewLocation.background': '#111827',
            'settings.viewLocation.text_color': '#ffffff',
            'settings.mobileView.background': '#ffffff',
            'settings.mobileView.text_color': '#111827',
            'settings.mobileView.active_background': '#ffffff',
            'settings.mobileView.active_border_color': '#111827',
            'features.map_style': 'CartoDB.Positron',
        },
    },
];

/* --------------------------------------------------------------------- *
 * Reading and writing the settings tree
 * ------------------------------------------------------------------ */

/** Read a catalogue path out of the live `{ settings, features }` state. */
export function readSetting(state, path) {
    return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), state);
}

/**
 * Apply validated changes, copying only the branches that are touched.
 *
 * Every other branch keeps its existing object identity, which is both what
 * preserves the merchant's unrelated customisations and what lets the sidebar's
 * `isEqual` unsaved-changes check stay accurate.
 */
export function applyConfigChanges(state, changes) {
    const next = { settings: { ...state.settings }, features: { ...state.features } };

    for (const change of changes) {
        const parts = change.path.split('.');
        let node = next;
        for (let index = 0; index < parts.length - 1; index++) {
            const key = parts[index];
            node[key] = Array.isArray(node[key]) ? [...node[key]] : { ...node[key] };
            node = node[key];
        }
        node[parts[parts.length - 1]] = change.value;
    }

    return next;
}

/* --------------------------------------------------------------------- *
 * Interpretation
 * ------------------------------------------------------------------ */

/**
 * Split a request into the clauses that each ask for one thing.
 *
 * Both spellings of each clause are returned: the lower-cased one everything
 * matches against, and the merchant's own capitalisation, which a quoted button
 * label has to keep.
 */
function splitClauses(request) {
    return String(request ?? '')
        .split(/[,;.\n]|\band\b|\balso\b|\bplus\b|\bthen\b/i)
        .map((clause) => clause.trim())
        .filter((clause) => clause.length > 2)
        .map((clause) => ({ clause: clause.toLowerCase(), original: clause }));
}

/**
 * Build the change for one clause once its setting is known.
 *
 * `clause` is lower-cased for matching; `original` keeps the merchant's own
 * capitalisation, which matters for a quoted button label — "Find a store" is
 * what they want printed, not "find a store".
 */
function buildChange(clause, setting, currentState, original = clause) {
    switch (setting.type) {
        case 'boolean':
            return { path: setting.path, value: readBoolean(clause) };

        case 'color': {
            const value = readColor(clause);
            return value ? { path: setting.path, value } : null;
        }

        case 'number': {
            const value = readNumber(clause);
            if (value === null) return null;
            const clamped = Math.min(setting.max ?? Infinity, Math.max(setting.min ?? -Infinity, value));
            return { path: setting.path, value: clamped };
        }

        case 'choice': {
            const value = readNumber(clause);
            if (value === null) return null;
            return { path: setting.path, value: snapToOption(value, setting.options) };
        }

        case 'radius': {
            // The radius is stored in whichever unit the locator uses, and the
            // sidebar only offers that unit's presets. A request in the other
            // unit is converted rather than refused — "20 km" on a miles
            // locator becomes the nearest mile preset, and the note says so.
            const value = readNumber(clause);
            if (value === null) return null;

            const currentUnit = currentState.features.distance_unit === 'km' ? 'km' : 'mi';
            const askedUnit = /\bkm\b|kilometre|kilometer/.test(clause) ? 'km'
                : /\bmi\b|mile/.test(clause) ? 'mi'
                    : currentUnit;

            const inCurrentUnit = askedUnit === currentUnit
                ? value
                : Number(convertDistance(value, askedUnit, currentUnit));
            const snapped = snapToOption(inCurrentUnit, getSearchRadiiValues(currentUnit));

            return {
                path: setting.path,
                value: snapped,
                note: askedUnit !== currentUnit
                    ? `${value} ${askedUnit} converted to the locator's ${currentUnit} presets`
                    : (snapped !== value ? `snapped to the nearest available radius` : ''),
            };
        }

        case 'enum': {
            const value = readEnum(clause, setting);
            return value === null ? null : { path: setting.path, value };
        }

        case 'text': {
            // Only a quoted string is taken as a label: an unquoted clause is
            // the merchant describing what they want, not the literal text they
            // want printed on the button.
            const quoted = /["“”'‘’](.+?)["“”'‘’]/.exec(original);
            return quoted ? { path: setting.path, value: quoted[1].trim() } : null;
        }

        default:
            return null;
    }
}

/**
 * Similarity floor for deciding a clause names a setting.
 *
 * Two floors, because the two cases carry different amounts of evidence. A
 * toggle ("show the filters") is *only* words, so it has to match a setting
 * clearly. A clause that carries a value ("use a navy search button") has
 * already been narrowed to the settings that could hold a colour, so a weaker
 * textual match is enough to pick between them — measured against the real
 * model, the right control scores ~0.45 there while a clause naming no control
 * at all ("make it navy") scores below 0.2, leaving plenty of room.
 */
const SETTING_THRESHOLD = 0.45;
const VALUE_SETTING_THRESHOLD = 0.38;
/** Similarity floor for a whole-look recipe. */
const RECIPE_THRESHOLD = 0.5;
/** How many ranked settings a clause may fall through before giving up. */
const SETTING_CANDIDATES = 4;

/**
 * What kind of value the merchant actually typed, and therefore which settings
 * could possibly be the one they mean.
 *
 * This is the single biggest thing keeping the matching honest. Ranking a
 * clause against all 60-odd settings by similarity alone puts "use a navy
 * search button" next to the search button's *label*, because the words are
 * nearly identical; but a colour can only be a colour setting, so the pool that
 * clause is ranked against holds only the twenty-odd colour controls and the
 * right one wins. The merchant's value narrows the search — the model only
 * chooses within what the value already permits.
 */
function valueKinds(clause) {
    const color = readColor(clause);
    const quoted = /["“”'‘’](.+?)["“”'‘’]/.test(clause);
    const number = readNumber(clause) !== null;

    const types = new Set();
    if (color) types.add('color');
    if (number) { types.add('number'); types.add('choice'); types.add('radius'); }
    if (quoted) types.add('text');

    // An option word can appear alongside anything ("square borders", "satellite
    // map"), and a clause with no value at all is a toggle ("show the filters").
    types.add('enum');
    if (!color && !quoted && !number) types.add('boolean');

    return { types, hasExplicitValue: Boolean(color || quoted || number) };
}

/**
 * Interpret a natural-language configuration request.
 *
 * @param {string} request What the merchant typed.
 * @param {{ settings: object, features: object, user_plan: string }} state
 * @param {{ signal?: AbortSignal, onProgress?: Function }} options
 * @returns {Promise<{ changes: Array, skipped: Array, unmatched: string[] }>}
 *   `changes` each carry `{ path, value, label, from, note }` for the preview.
 *   `skipped` explains a setting that was understood but can't be applied — a
 *   Business-only control on a lower plan. `unmatched` lists the clauses that
 *   named nothing in the catalogue, which the panel reports honestly rather
 *   than silently dropping.
 */
export async function interpretConfigRequest(request, state, options = {}) {
    const split = splitClauses(request);
    if (split.length === 0) return { changes: [], skipped: [], unmatched: [] };

    const clauses = split.map((entry) => entry.clause);
    const originals = split.map((entry) => entry.original);

    // One embedding pass for the whole request: every clause, every setting
    // phrase and every recipe phrase go through the model together.
    const settingPhrases = [];
    SETTING_CATALOGUE.forEach((setting) => {
        setting.phrases.forEach((phrase) => settingPhrases.push({ path: setting.path, phrase }));
    });
    const recipePhrases = [];
    RECIPES.forEach((recipe) => {
        recipe.phrases.forEach((phrase) => recipePhrases.push({ id: recipe.id, phrase }));
    });

    const vectors = await embedTexts([
        ...settingPhrases.map((entry) => entry.phrase),
        ...recipePhrases.map((entry) => entry.phrase),
        ...clauses,
    ], options);

    const settingVectors = vectors.slice(0, settingPhrases.length);
    const recipeVectors = vectors.slice(settingPhrases.length, settingPhrases.length + recipePhrases.length);
    const clauseVectors = vectors.slice(settingPhrases.length + recipePhrases.length);

    const proposed = new Map(); // path -> { value, note, via }
    const skipped = [];
    const unmatched = [];

    clauses.forEach((clause, index) => {
        const vector = clauseVectors[index];
        const { types, hasExplicitValue } = valueKinds(clause);

        // A whole-look recipe, but only for a clause that names no value of its
        // own. "Make it dark" is a colour scheme; "make the background black"
        // names one colour for one control and must not repaint the widget.
        if (!hasExplicitValue) {
            const [bestRecipe] = rank(vector, recipePhrases.map((entry, position) => ({
                id: entry.id,
                vector: recipeVectors[position],
            })), { threshold: RECIPE_THRESHOLD, limit: 1 });

            if (bestRecipe) {
                const recipe = RECIPES.find((entry) => entry.id === bestRecipe.id);
                for (const [path, value] of Object.entries(recipe.changes)) {
                    proposed.set(path, { value, note: '', via: recipe.label });
                }
                return;
            }
        }

        // Rank only against settings whose type the clause's value could fill.
        const eligible = settingPhrases
            .map((entry, position) => ({ entry, position }))
            .filter(({ entry }) => types.has(BY_PATH.get(entry.path).type))
            .map(({ entry, position }) => ({ path: entry.path, vector: settingVectors[position] }));

        const ranked = rank(vector, eligible, {
            threshold: hasExplicitValue ? VALUE_SETTING_THRESHOLD : SETTING_THRESHOLD,
            limit: SETTING_CANDIDATES * 3,
        });

        // Walk the ranked settings and take the first that the clause can
        // actually produce a value for. A near-miss on the top match (an enum
        // whose option isn't named, a text field with nothing quoted) then falls
        // through to the runner-up instead of failing the whole clause.
        let applied = false;
        const seen = new Set();
        for (const candidate of ranked) {
            if (seen.has(candidate.path)) continue;
            seen.add(candidate.path);
            if (seen.size > SETTING_CANDIDATES) break;

            const setting = BY_PATH.get(candidate.path);
            if (setting.plan && !isPlanAllowed(setting, state.user_plan)) {
                skipped.push({ path: setting.path, label: setting.label, reason: 'available on the Business plan only' });
                applied = true;
                break;
            }

            const change = buildChange(clause, setting, state, originals[index]);
            if (!change) continue;

            // A clause that names a setting and gives a value beats a recipe
            // that already wrote that path, so "make it dark, but keep the
            // search button green" ends up green.
            proposed.set(change.path, { value: change.value, note: change.note ?? '', via: '' });
            applied = true;
            break;
        }

        if (!applied) unmatched.push(clause);
    });

    // Validate every proposal against the allowlist and its own type before it
    // is shown, then drop the ones that match the current value — a change list
    // should only contain things that will actually change.
    const changes = [];
    for (const [path, entry] of proposed) {
        const setting = BY_PATH.get(path);
        if (!setting) continue;
        if (setting.plan && !isPlanAllowed(setting, state.user_plan)) {
            skipped.push({ path, label: setting.label, reason: 'available on the Business plan only' });
            continue;
        }

        const parsed = configChangeSchema.safeParse({ path, value: entry.value });
        if (!parsed.success || !isValidForSetting(setting, parsed.data.value)) continue;

        const from = readSetting(state, path);
        if (from === parsed.data.value) continue;

        changes.push({
            path,
            value: parsed.data.value,
            from,
            label: setting.label,
            type: setting.type,
            note: entry.note,
            via: entry.via,
        });
    }

    return { changes, skipped, unmatched };
}

/** Business-gated controls: the sidebar disables them, so the AI can't set them either. */
function isPlanAllowed(setting, user_plan) {
    if (setting.plan !== 'business') return true;
    return user_plan === 'business';
}

/** Final type check for a value, using the setting's own declared shape. */
function isValidForSetting(setting, value) {
    switch (setting.type) {
        case 'boolean':
            return typeof value === 'boolean';
        case 'color':
            return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
        case 'number':
            return typeof value === 'number' && Number.isFinite(value)
                && value >= (setting.min ?? -Infinity) && value <= (setting.max ?? Infinity);
        case 'choice':
        case 'radius':
            return typeof value === 'number' && Number.isFinite(value);
        case 'enum':
            return setting.options.includes(value);
        case 'text':
            return typeof value === 'string' && value.length > 0 && value.length <= 120;
        default:
            return false;
    }
}

/** Render a value the way the change list should show it. */
export function formatConfigValue(setting, value) {
    if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
    if (value === '' || value === null || value === undefined) return 'None';

    const entry = typeof setting === 'string' ? BY_PATH.get(setting) : setting;
    if (entry?.optionLabels) {
        const match = entry.optionLabels.find((option) => option.code === value);
        if (match) return match.label;
    }
    return String(value);
}

/** The catalogue entry for a path, for callers rendering a change list. */
export const settingForPath = (path) => BY_PATH.get(path);
