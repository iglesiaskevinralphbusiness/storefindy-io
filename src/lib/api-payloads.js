// JSON request-body validation for the REST API under /api/v1.
//
// The dashboard server actions validate `FormData`; these schemas apply the
// same rules to a JSON body, keyed by the model's own field names so requests
// and responses are symmetric. Error shape matches the actions:
// `{ status: 'error', errors: { field: message } }`.
import { z } from 'zod';
import { isObjectIdString, readBoundedText, sanitizeMongoInput, LIMITS } from '@/lib/api-sanitize';
import {
    MAPBOX_STYLES,
    MAPBOX_SOURCE_TEMPLATE,
    MAPBOX_SOURCE_CUSTOM,
    MAPBOX_CUSTOM_JSON_MAX,
    MAP_LIBRARY_MAPBOX,
    parseMapboxCustomJson,
} from '@/utils/constant/mapbox-styles';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Per-field length caps. Mongoose enforces *types* but not sizes, so without
// these a single request can write a multi-megabyte document — and every locator
// read after it pays for that. Generous enough not to reject real content.
const MAX_LENGTHS = {
    name: 200,
    description: 2000,
    locator_id: 24,
    street: 200,
    city: 120,
    state: 120,
    postal: 40,
    country: 80,
    location_status: 60,
    phone: 60,
    email: 254, // RFC 5321
    website: 2000,
    view_location_url: 2000,
    custom_notes: 5000,
    photo: 2000,
    icon: 2000,
    default_language: 20,
    default_country: 80,
};
const DEFAULT_MAX_LENGTH = 500;

// Caps for the collection-valued fields.
const MAX_FILTERS = 100;
const MAX_FILTER_LENGTH = 120;
const MAX_HOLIDAYS = 100;
const MAX_SOCIAL_LINKS = 30;
const MAX_TIME_LENGTH = 20;

/* --------------------------------------------------------------------- *
 * Inline images
 *
 * Every image on a location or a locator is stored as a base64 data URL in the
 * document itself — there is no file store, so the string *is* the image. The
 * dashboard produces one with FileReader; the WordPress plugin does the same.
 * ------------------------------------------------------------------ */

/** The formats every image field accepts. */
const IMAGE_DATA_PREFIXES = [
    'data:image/png;base64,',
    'data:image/svg+xml;base64,',
    'data:image/gif;base64,',
    'data:image/jpeg;base64,',
];

/**
 * Character cap for a base64 payload of `bytes`. Base64 spends 4 characters on
 * every 3 bytes; the slack covers the `data:` prefix and the padding.
 */
const base64Chars = (bytes) => Math.ceil((bytes * 4) / 3) + 200;

/** Byte limits, matching the client-side checks so both reject the same files. */
const IMAGE_MAX_BYTES = {
    icon: 500 * 1024,
    photo: 1024 * 1024,
    pin: 500 * 1024,
};

const IMAGE_MAX_LABELS = { icon: '500KB', photo: '1MB', pin: '500KB' };

/**
 * A base64 image for `field`, or a hosted URL.
 *
 * The URL form is legacy: the plugin used to store a Media Library URL in
 * `photo`, so those values are still accepted — re-saving one of those
 * locations must not fail on a field the merchant never touched.
 */
function validateImageString(value, field, label = field) {
    if (value === '' || value === undefined || value === null) return { str: '' };
    if (typeof value !== 'string') return { error: `${label} must be a string` };

    const str = value.trim();
    if (str === '') return { str: '' };

    if (str.startsWith('data:')) {
        if (!IMAGE_DATA_PREFIXES.some((prefix) => str.startsWith(prefix))) {
            return { error: `${label} must be a PNG, SVG, GIF, or JPEG data URL` };
        }
        if (str.length > base64Chars(IMAGE_MAX_BYTES[field])) {
            return { error: `${label} exceeds the ${IMAGE_MAX_LABELS[field]} limit` };
        }
        return { str };
    }

    const max = MAX_LENGTHS[field] ?? DEFAULT_MAX_LENGTH;
    if (str.length > max) return { error: `${label} cannot exceed ${max} characters` };
    return { str };
}

/** Trim a value to a string and report whether it busts the field's cap. */
function boundedString(value, field) {
    const max = MAX_LENGTHS[field] ?? DEFAULT_MAX_LENGTH;
    const str = String(value ?? '').trim();
    return { str, max, tooLong: str.length > max };
}

/**
 * `filters` is `{ type: Array }` in both schemas — completely untyped, so
 * mongoose casts nothing and whatever arrives is stored verbatim. The widget
 * search route matches it with `$in` against plain strings, so that is what the
 * API accepts.
 */
function validateFilters(value, label) {
    if (!Array.isArray(value)) return { error: `${label} must be an array` };
    if (value.length > MAX_FILTERS) return { error: `${label} cannot exceed ${MAX_FILTERS} items` };

    const values = [];
    for (const item of value) {
        if (typeof item !== 'string') return { error: `${label} must contain only strings` };

        const trimmed = item.trim();
        if (trimmed === '') continue;
        if (trimmed.length > MAX_FILTER_LENGTH) {
            return { error: `${label} entries cannot exceed ${MAX_FILTER_LENGTH} characters` };
        }
        values.push(trimmed);
    }
    return { values };
}

/** A time string as the dashboard's time inputs produce — length-capped only. */
function boundedTime(value) {
    const str = String(value ?? '').trim();
    return str.length > MAX_TIME_LENGTH ? null : str;
}

/**
 * Rebuild `holidays` to exactly the fields holidaySchema declares. Mongoose
 * would strip the extras anyway; doing it here keeps the stored shape and the
 * validation errors predictable.
 */
function validateHolidays(value) {
    if (!Array.isArray(value)) return { error: 'Holidays must be an array' };
    if (value.length > MAX_HOLIDAYS) return { error: `Holidays cannot exceed ${MAX_HOLIDAYS} items` };

    const values = [];
    for (const item of value) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return { error: 'Each holiday must be an object' };
        }

        const from = boundedTime(item.from);
        const to = boundedTime(item.to);
        const open = boundedTime(item.open);
        const close = boundedTime(item.close);
        if (from === null || to === null || open === null || close === null) {
            return { error: 'Holiday date and time values are too long' };
        }
        if (!from || !to) return { error: 'Each holiday needs a from and to date' };

        const enabled = Boolean(item.enabled);
        if (enabled && (!open || !close)) {
            return { error: 'Open and close times are required for enabled holidays' };
        }
        values.push({ from, to, enabled, open, close });
    }
    return { values };
}

/** Rebuild `hours` to the seven days, each with only enabled/open/close. */
function validateHours(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { error: 'Business hours are required for every day' };
    }

    const hours = {};
    for (const day of DAYS) {
        const d = value[day];
        if (!d || typeof d !== 'object' || typeof d.enabled !== 'boolean') {
            return { error: 'Business hours are required for every day' };
        }

        const open = boundedTime(d.open);
        const close = boundedTime(d.close);
        if (open === null || close === null) return { error: 'Business hour values are too long' };
        if (d.enabled && (!open || !close)) {
            return { error: 'Open and close times are required for enabled days' };
        }
        hours[day] = { enabled: d.enabled, open, close };
    }
    return { values: hours };
}

// Locator fields the schema requires but the create form always supplies —
// mirrors the defaults in dashboard/locators/create/create-client.js.
const LOCATOR_DEFAULTS = {
    description: '',
    default_language: 'en',
    default_country: 'us',
    default_zoom_level: 10,
    distance_unit: 'mi',
    search_radius: 10,
    maximum_results_shown: 10,
    filters: [],
    show_search_bar: true,
    detect_location: true,
    show_filters: false,
    show_radius: false,
    show_store_list: true,
    show_directions: true,
    show_store_hours: false,
    powered_by_storefindy: true,
};

// Every writable locator field, so unknown keys in the body are ignored rather
// than written straight through to the document.
const LOCATOR_FIELDS = Object.keys(LOCATOR_DEFAULTS);

const LOCATION_BOOLEANS = ['published', 'show_opening_hours'];
const LOCATION_STRINGS = [
    'name', 'locator_id', 'description', 'street', 'city', 'state', 'postal',
    'country', 'location_status', 'phone', 'email', 'website', 'view_location_url',
    'custom_notes',
];

// Validated by validateImageString() rather than the plain cap above, because a
// base64 image runs to hundreds of thousands of characters:
//   icon  — the per-location map pin. Empty means "use the locator's pin",
//           see iconForLocation() in src/components/Locator/pin-icons.js.
//   photo — the banner on the store card.
const LOCATION_IMAGE_FIELDS = ['icon', 'photo'];

/**
 * Both image fields, for readJsonBody()'s `longStringPaths`. Without this the
 * generic 5,000-character cap rejects every inline image before
 * validateLocationPayload() can apply the real per-field byte limit.
 */
export const LOCATION_LONG_STRING_PATHS = [...LOCATION_IMAGE_FIELDS];

/**
 * Body cap for the two location writes. An icon at its 500KB limit is ~683KB of
 * base64 and a photo at its 1MB limit is ~1.4MB, so a location carrying both
 * needs room the 256KB default cannot give.
 */
export const LOCATION_BODY_MAX_BYTES = 3 * 1024 * 1024;

function issuesToErrors(issues) {
    const errors = {};
    for (const issue of issues) {
        const key = issue.path[0];
        if (key && !errors[key]) errors[key] = issue.message;
    }
    return errors;
}

// Coordinate field: required, coerced to number, within range.
const coordinate = (min, max, label) =>
    z.preprocess(
        (v) => (v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v),
        z.coerce
            .number({ message: `${label} must be a number between ${min} and ${max}` })
            .min(min, `${label} must be between ${min} and ${max}`)
            .max(max, `${label} must be between ${min} and ${max}`)
    );

// Optional string: empty is allowed, but if present it must match the format.
const optionalFormat = (format, message) =>
    z.string().trim().refine((v) => v === '' || format.safeParse(v).success, { message });

/**
 * Read and parse a JSON request body.
 * Returns `{ body }` or `{ errors }` when the payload isn't a usable JSON object.
 *
 * Three gates, in order, before a validator ever sees the body:
 *   1. size   — the stream is counted and cut off past the byte cap, so a
 *              100MB body (which Vercel now accepts) is never buffered whole.
 *   2. shape  — must be a JSON object, not an array or a scalar.
 *   3. keys   — `$`-prefixed, dotted and prototype keys are dropped, and
 *              depth/key-count/array/string limits are enforced.
 *
 * @param {Request} request
 * @param {{ maxBytes?: number, longStringPaths?: string[] }} options `maxBytes`
 *   raises the size gate for a route that legitimately carries more than one
 *   record — see the CSV import. `longStringPaths` exempts named fields from
 *   the per-string cap for a route whose validator caps them itself — see the
 *   customize endpoint's base64 pin image. The structural limits in
 *   sanitizeMongoInput() still apply either way.
 */
export async function readJsonBody(
    request,
    { maxBytes = LIMITS.bodyBytes, longStringPaths = [] } = {}
) {
    const { text, error: sizeError } = await readBoundedText(request, maxBytes);
    if (sizeError) return { errors: { body: sizeError } };

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        return { errors: { body: 'Request body must be valid JSON' } };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { errors: { body: 'Request body must be a JSON object' } };
    }

    const { value, error } = sanitizeMongoInput(parsed, { longStringPaths });
    if (error) return { errors: { body: error } };

    return { body: value };
}

/**
 * Locator create/update payload.
 *
 * @param {object}  body    Parsed JSON body.
 * @param {boolean} partial When true (PUT), only the supplied fields are
 *                          validated and returned, so omitted fields keep
 *                          their current values.
 */
export function validateLocatorPayload(body, { partial = false } = {}) {
    const errors = {};
    const form = {};

    const nameProvided = body.name !== undefined;
    if (!partial || nameProvided) {
        const { str: name, max, tooLong } = boundedString(body.name, 'name');
        // Same rule the dashboard applies: a locator must have a name.
        if (name === '') {
            errors.name = 'Locator name is required';
        } else if (tooLong) {
            errors.name = `Locator name cannot exceed ${max} characters`;
        } else {
            form.name = name;
        }
    }

    // Ranges match the dashboard's own dropdowns (ZOOM_LEVELS, SEARCH_RADII,
    // MAXIMUM_RESULTS_SHOWN in utils/constant) — including 999999 for "All
    // results". Bounding matters beyond tidiness: the public widget route reads
    // `search_radius` as a geo radius and `maximum_results_shown` as its result
    // limit, so an unbounded value written here becomes an expensive query for
    // every unauthenticated visitor afterwards.
    const numeric = {
        default_zoom_level: { label: 'Default zoom level', min: 1, max: 20 },
        search_radius: { label: 'Search radius', min: 1, max: 2000 },
        maximum_results_shown: { label: 'Maximum results shown', min: 1, max: 999999 },
    };

    for (const field of LOCATOR_FIELDS) {
        const provided = body[field] !== undefined;

        if (!provided) {
            if (!partial) form[field] = LOCATOR_DEFAULTS[field];
            continue;
        }

        if (field in numeric) {
            const { label, min, max } = numeric[field];
            const parsed = z.coerce.number().safeParse(body[field]);
            if (!parsed.success || !Number.isFinite(parsed.data)) {
                errors[field] = `${label} must be a number`;
                continue;
            }
            if (parsed.data < min || parsed.data > max) {
                errors[field] = `${label} must be between ${min} and ${max}`;
                continue;
            }
            form[field] = parsed.data;
        } else if (typeof LOCATOR_DEFAULTS[field] === 'boolean') {
            form[field] = Boolean(body[field]);
        } else if (field === 'filters') {
            const { values, error } = validateFilters(body.filters, 'Filters');
            if (error) {
                errors.filters = error;
                continue;
            }
            form.filters = values;
        } else if (field === 'distance_unit') {
            const unit = String(body[field] ?? '').trim();
            if (unit !== 'mi' && unit !== 'km') {
                errors.distance_unit = 'Distance unit must be mi or km';
                continue;
            }
            form.distance_unit = unit;
        } else {
            const { str, max, tooLong } = boundedString(body[field], field);
            if (tooLong) {
                errors[field] = `${field} cannot exceed ${max} characters`;
                continue;
            }
            form[field] = str;
        }
    }

    if (Object.keys(errors).length > 0) return { errors };
    return { form };
}

/**
 * Location create/update payload — the JSON equivalent of the zod schema in
 * postCreateLocation()/postEditLocation(), including the business-hours check.
 *
 * @param {object}  body    Parsed JSON body.
 * @param {boolean} partial When true (PUT), only the supplied fields are
 *                          validated and returned.
 */
export function validateLocationPayload(body, { partial = false } = {}) {
    const errors = {};
    const form = {};

    for (const field of LOCATION_STRINGS) {
        if (body[field] === undefined) continue;

        const { str, max, tooLong } = boundedString(body[field], field);
        if (tooLong) errors[field] = `${field} cannot exceed ${max} characters`;
        else form[field] = str;
    }
    for (const field of LOCATION_BOOLEANS) {
        if (body[field] !== undefined) form[field] = Boolean(body[field]);
    }
    for (const field of LOCATION_IMAGE_FIELDS) {
        if (body[field] === undefined) continue;

        const { str, error } = validateImageString(body[field], field);
        if (error) errors[field] = error;
        else form[field] = str;
    }

    // `locator_id` is checked for shape here so a malformed value fails as a
    // validation error rather than reaching requireOwnedLocator() or, worse, the
    // `$toObjectId` in queryLocations().
    if (form.locator_id !== undefined && form.locator_id !== '' && !isObjectIdString(form.locator_id)) {
        errors.locator_id = 'Locator ID must be a valid 24-character ID';
        delete form.locator_id;
    }

    if (body.filters !== undefined) {
        const { values, error } = validateFilters(body.filters, 'Filters');
        if (error) errors.filters = error;
        else form.filters = values;
    }
    if (body.holidays !== undefined) {
        const { values, error } = validateHolidays(body.holidays);
        if (error) errors.holidays = error;
        else form.holidays = values;
    }
    if (body.social_media_links !== undefined) {
        if (!Array.isArray(body.social_media_links)) {
            errors.social_media_links = 'Social media links must be an array';
        } else if (body.social_media_links.length > MAX_SOCIAL_LINKS) {
            errors.social_media_links = `Social media links cannot exceed ${MAX_SOCIAL_LINKS} items`;
        } else {
            form.social_media_links = body.social_media_links
                .map((item) => ({
                    code: String(item?.code ?? '').trim().slice(0, 40),
                    link: String(item?.link ?? '').trim().slice(0, MAX_LENGTHS.website),
                }))
                .filter((item) => item.code && item.link);
        }
    }

    // On create every required field must be present; on update only validate
    // what the caller actually sent.
    const required = {
        name: z.string().trim().min(1, 'Store name is required'),
        locator_id: z.string().trim().min(1, 'Locator is required'),
        city: z.string().trim().min(1, 'City is required'),
        state: z.string().trim().min(1, 'State is required'),
        country: z.string().trim().min(1, 'Country is required'),
        location_status: z.string().trim().min(1, 'Location status is required'),
        latitude: coordinate(-90, 90, 'Latitude'),
        longitude: coordinate(-180, 180, 'Longitude'),
    };
    const optional = {
        email: optionalFormat(z.email(), 'Email is not a valid format'),
        website: optionalFormat(z.url(), 'Website must be a valid URL (including http:// or https://)'),
        view_location_url: optionalFormat(z.url(), 'View location URL must be a valid URL (including http:// or https://)'),
    };

    const shape = {};
    const values = {};
    for (const [field, rule] of Object.entries({ ...required, ...optional })) {
        const isCoordinate = field === 'latitude' || field === 'longitude';
        const provided = body[field] !== undefined;

        if (partial && !provided) continue;
        if (!partial && !provided && field in optional) continue;

        shape[field] = rule;
        values[field] = isCoordinate ? body[field] : (form[field] ?? body[field] ?? '');
    }

    const parsed = z.object(shape).safeParse(values);
    if (!parsed.success) {
        Object.assign(errors, issuesToErrors(parsed.error.issues));
    } else {
        // Use the coerced number values from zod to match schema types
        if (parsed.data.latitude !== undefined) form.latitude = parsed.data.latitude;
        if (parsed.data.longitude !== undefined) form.longitude = parsed.data.longitude;
    }

    // Hours: every day must be present with valid open/close when enabled.
    // Required on create; on update only checked when `hours` is supplied.
    // validateHours() rebuilds the object from the seven known days, so unknown
    // keys never reach the document.
    const hours = body.hours;
    if (!partial || hours !== undefined) {
        const { values, error } = validateHours(hours);
        if (error) errors.hours = error;
        else if (hours !== undefined) form.hours = values;
    }

    if (Object.keys(errors).length > 0) return { errors };
    return { form };
}

/**
 * The `action` field shared by the publish endpoints — the JSON equivalent of
 * the `action` argument on postPublishLocation()/postBulkPublishLocations().
 *
 * The actions treat anything that isn't the string 'publish' as an unpublish,
 * so a typo there silently hides a location. Here it is a whitelist instead:
 * those two spellings are the only accepted values.
 *
 * Returns `{ action, published }` or `{ errors }`.
 */
export function validatePublishAction(body) {
    const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';

    if (action !== 'publish' && action !== 'unpublish') {
        return { errors: { action: 'Action must be either "publish" or "unpublish"' } };
    }

    return { action, published: action === 'publish' };
}

/**
 * The `location_ids` field shared by the bulk endpoints.
 *
 * Every entry is checked against the strict 24-hex form rather than mongoose's
 * isValidObjectId() — see isObjectIdString() — and the list is capped, because
 * these become the terms of an `$in` filter. The dashboard actions reject the
 * whole request on the first bad ID, and so does this.
 *
 * Returns `{ location_ids }` or `{ errors }`.
 */
export function validateLocationIdList(body) {
    const ids = body.location_ids;

    if (!Array.isArray(ids) || ids.length === 0) {
        return { errors: { location_ids: 'No locations selected' } };
    }
    if (ids.length > LIMITS.idList) {
        return {
            errors: {
                location_ids: `Cannot process more than ${LIMITS.idList} locations in one request`,
            },
        };
    }
    if (!ids.every(isObjectIdString)) {
        return { errors: { location_ids: 'Invalid selected location' } };
    }

    // Duplicates would inflate the "N locations" arithmetic in the response
    // without changing what the query touches, so they are collapsed here.
    return { location_ids: Array.from(new Set(ids)) };
}

/* --------------------------------------------------------------------- *
 * Locator customize payload — GET/PUT /api/v1/locators/:id/customize
 * ------------------------------------------------------------------ */

const CUSTOMIZE_FEATURE_FIELDS = [
    'show_map_radius_indicator',
    'show_map_pin_number',
    'form_style',
    'focused_zoom',
    'dynamic_search',
    'map_style',
    'show_search_bar',
    'detect_location',
    'show_filters',
    'show_radius',
    'show_store_list',
    'show_directions',
    'show_store_hours',
    'powered_by_storefindy',
];

// Validated separately from CUSTOMIZE_FEATURE_FIELDS because these are
// optional: the endpoint predates Mapbox, so an existing client that omits them
// must keep working rather than fail a "required" check.
//
// Note that over THIS endpoint `mapbox_custom_json` is additionally capped at
// LIMITS.stringLength (5,000 chars) by sanitizeMongoInput, well below
// MAPBOX_CUSTOM_JSON_MAX. The dashboard's own save action does not go through
// that sanitiser, so a full-size style document pasted in the customize sidebar
// saves fine; only a large document pushed over the REST API is rejected.
// Raising the cap is a decision about every endpoint, not just this field, so
// it is left alone. (`settings.pin.image` used to be caught by the same cap,
// which broke every custom pin upload over the API — it is now exempted via
// CUSTOMIZE_LONG_STRING_PATHS and bounded by validatePinImage() instead.)
const CUSTOMIZE_MAP_LIBRARY_FIELDS = [
    'map_library',
    'mapbox_style_source',
    'mapbox_style',
    'mapbox_custom_json',
];

const CUSTOMIZE_HEIGHTS = new Set(['small', 'medium', 'large']);
const CUSTOMIZE_BORDERS = new Set(['none', 'rounded', 'pill', 'square']);
const CUSTOMIZE_PIN_TYPES = new Set(['standard', 'custom']);
const CUSTOMIZE_PIN_SIZES = new Set(['small', 'medium', 'large']);
const CUSTOMIZE_FORM_STYLES = new Set(['style-1', 'style-2', 'style-3']);

const SETTINGS_TOP = ['height', 'background', 'text_color', 'font_family', 'font_size', 'border', 'border_color'];
const SETTINGS_GROUPS = {
    searchInput: ['border', 'background', 'text_color', 'border_color', 'placeholder'],
    search: ['border', 'background', 'label', 'text_color', 'icon'],
    filter: ['border', 'background', 'label', 'text_color', 'icon'],
    filterList: ['border_color', 'background', 'text_color', 'active_background', 'active_text_color'],
    resultItem: ['active_border_color', 'active_background', 'border', 'border_color', 'background'],
    getDirections: ['border', 'background', 'label', 'text_color', 'icon'],
    viewLocation: ['border', 'background', 'label', 'text_color', 'icon'],
    pin: ['type', 'color', 'size', 'text_color', 'text_size', 'image'],
    mobileView: ['background', 'text_color', 'active_border_color', 'active_background'],
};

/**
 * Fields on this endpoint that readJsonBody() must not measure against
 * LIMITS.stringLength. A 500KB pin image is ~683,000 base64 characters, so the
 * generic 5,000-char cap would reject every custom pin before this validator
 * ran. validatePinImage() applies the real limit.
 */
export const CUSTOMIZE_LONG_STRING_PATHS = ['settings.pin.image'];

/** Strip pin.image before the generic sanitizer runs — base64 exceeds stringLength. */
function sanitizeCustomizeBody(body) {
    const pinImage =
        body?.settings?.pin && typeof body.settings.pin.image === 'string'
            ? body.settings.pin.image
            : '';

    const clone = { ...body };
    if (clone.settings && typeof clone.settings === 'object') {
        clone.settings = { ...clone.settings };
        if (clone.settings.pin && typeof clone.settings.pin === 'object') {
            clone.settings.pin = { ...clone.settings.pin, image: '' };
        }
    }

    const { value, error } = sanitizeMongoInput(clone);
    if (error) return { error };

    if (pinImage !== '') {
        value.settings = value.settings || {};
        value.settings.pin = value.settings.pin || {};
        value.settings.pin.image = pinImage;
    }

    return { value };
}

function customizeString(value, field, max = 200) {
    const str = String(value ?? '').trim();
    if (str.length > max) {
        return { error: `${field} cannot exceed ${max} characters` };
    }
    return { str };
}

/**
 * The locator's custom pin. Unlike a location's `icon`/`photo` this has only
 * ever been a data URL, so a bare URL is rejected rather than accepted as the
 * legacy form.
 */
function validatePinImage(value) {
    const { str, error } = validateImageString(value, 'pin', 'Pin image');
    if (error) return { error };
    if (str !== '' && !str.startsWith('data:')) {
        return { error: 'Pin image must be a PNG, SVG, GIF, or JPEG data URL' };
    }
    return { str };
}

function validateSettings(settings, errors) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
        errors.settings = 'Settings object is required';
        return null;
    }

    const out = {};

    for (const field of SETTINGS_TOP) {
        const raw = settings[field];
        if (field === 'height') {
            const code = String(raw ?? '').trim();
            if (!CUSTOMIZE_HEIGHTS.has(code)) {
                errors[`settings.${field}`] = 'Height must be small, medium, or large';
                continue;
            }
            out[field] = code;
        } else if (field === 'font_size') {
            const parsed = z.coerce.number().safeParse(raw);
            if (!parsed.success || !Number.isFinite(parsed.data) || parsed.data < 8 || parsed.data > 32) {
                errors[`settings.${field}`] = 'Root font size must be between 8 and 32';
                continue;
            }
            out[field] = parsed.data;
        } else if (field === 'border') {
            const code = String(raw ?? '').trim();
            if (!CUSTOMIZE_BORDERS.has(code)) {
                errors[`settings.${field}`] = 'Border wrapper must be none, rounded, pill, or square';
                continue;
            }
            out[field] = code;
        } else {
            const { str, error } = customizeString(raw, field, field === 'font_family' ? 120 : 40);
            if (error) {
                errors[`settings.${field}`] = error;
                continue;
            }
            out[field] = str;
        }
    }

    for (const [group, fields] of Object.entries(SETTINGS_GROUPS)) {
        const source = settings[group];
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            errors[`settings.${group}`] = `${group} settings are required`;
            continue;
        }

        out[group] = {};
        for (const field of fields) {
            const raw = source[field];
            if (field === 'text_size') {
                const parsed = z.coerce.number().safeParse(raw);
                if (!parsed.success || !Number.isFinite(parsed.data) || parsed.data < 8 || parsed.data > 32) {
                    errors[`settings.${group}.${field}`] = 'Text size must be between 8 and 32';
                    continue;
                }
                out[group][field] = parsed.data;
            } else if (field === 'type') {
                const code = String(raw ?? '').trim();
                if (!CUSTOMIZE_PIN_TYPES.has(code)) {
                    errors[`settings.${group}.${field}`] = 'Pin type must be standard or custom';
                    continue;
                }
                out[group][field] = code;
            } else if (field === 'size') {
                const code = String(raw ?? '').trim();
                if (!CUSTOMIZE_PIN_SIZES.has(code)) {
                    errors[`settings.${group}.${field}`] = 'Pin size must be small, medium, or large';
                    continue;
                }
                out[group][field] = code;
            } else if (field === 'border') {
                const code = String(raw ?? '').trim();
                if (!CUSTOMIZE_BORDERS.has(code)) {
                    errors[`settings.${group}.${field}`] = 'Border must be none, rounded, pill, or square';
                    continue;
                }
                out[group][field] = code;
            } else if (field === 'image') {
                const { str, error } = validatePinImage(raw);
                if (error) {
                    errors[`settings.${group}.${field}`] = error;
                    continue;
                }
                out[group][field] = str;
            } else {
                const max = field === 'placeholder' || field === 'label' ? 120 : 40;
                const { str, error } = customizeString(raw, field, max);
                if (error) {
                    errors[`settings.${group}.${field}`] = error;
                    continue;
                }
                out[group][field] = str;
            }
        }
    }

    return out;
}

/**
 * Customize update payload — mirrors functionSaveCustomizeLocator().
 *
 * Body shape:
 *   { settings: {...}, features: {...} }
 * or the feature flags at the top level alongside `settings`.
 *
 * @param {object} body Parsed JSON body.
 * @param {{ plan?: string }} options Caller plan for feature gating.
 */
export function validateCustomizePayload(body, { plan = 'free' } = {}) {
    const { value, error } = sanitizeCustomizeBody(body);
    if (error) return { errors: { body: error } };

    const errors = {};
    const settings = validateSettings(value.settings, errors);
    if (!settings) return { errors };

    const featureSource =
        value.features && typeof value.features === 'object' && !Array.isArray(value.features)
            ? value.features
            : value;

    const features = {};
    for (const field of CUSTOMIZE_FEATURE_FIELDS) {
        if (featureSource[field] === undefined) {
            errors[field] = `${field} is required`;
            continue;
        }

        if (field === 'form_style') {
            const code = String(featureSource[field] ?? '').trim();
            if (!CUSTOMIZE_FORM_STYLES.has(code)) {
                errors[field] = 'Form style must be style-1, style-2, or style-3';
                continue;
            }
            features[field] = code;
        } else if (field === 'map_style') {
            const { str, error: mapError } = customizeString(featureSource[field], field, 120);
            if (mapError) {
                errors[field] = mapError;
                continue;
            }
            features[field] = str;
        } else if (typeof featureSource[field] === 'boolean') {
            features[field] = featureSource[field];
        } else {
            features[field] = Boolean(featureSource[field]);
        }
    }

    // Map library — optional, unlike the fields above, so a client written
    // against the endpoint before Mapbox existed keeps working: leaving these
    // out means "the default (Leaflet) library".
    for (const field of CUSTOMIZE_MAP_LIBRARY_FIELDS) {
        if (featureSource[field] === undefined) {
            features[field] = '';
            continue;
        }
        const max = field === 'mapbox_custom_json' ? MAPBOX_CUSTOM_JSON_MAX : 200;
        const { str, error: fieldError } = customizeString(featureSource[field], field, max);
        if (fieldError) {
            errors[field] = fieldError;
            continue;
        }
        features[field] = str;
    }

    // The one non-string map-library field. Optional for the same reason as the
    // rest, and false — the flat map — when a client leaves it out.
    features.mapbox_3d = featureSource.mapbox_3d === undefined
        ? false
        : Boolean(featureSource.mapbox_3d);

    if (features.map_library && features.map_library !== MAP_LIBRARY_MAPBOX) {
        errors.map_library = `Map library must be empty (default) or "${MAP_LIBRARY_MAPBOX}"`;
    }
    if (features.mapbox_style_source
        && ![MAPBOX_SOURCE_TEMPLATE, MAPBOX_SOURCE_CUSTOM].includes(features.mapbox_style_source)) {
        errors.mapbox_style_source = `Mapbox style source must be "${MAPBOX_SOURCE_TEMPLATE}" or "${MAPBOX_SOURCE_CUSTOM}"`;
    }
    if (features.mapbox_style
        && !MAPBOX_STYLES.some((style) => style.code === features.mapbox_style)) {
        errors.mapbox_style = 'Mapbox style is not one of the supported templates';
    }
    // Only checked when it is the style that would actually be rendered — a
    // half-finished paste parked behind the template option isn't an error.
    if (features.map_library === MAP_LIBRARY_MAPBOX
        && features.mapbox_style_source === MAPBOX_SOURCE_CUSTOM) {
        const { error: jsonError } = parseMapboxCustomJson(features.mapbox_custom_json);
        if (jsonError) errors.mapbox_custom_json = jsonError;
    }

    if (Object.keys(errors).length > 0) return { errors };

    // Plan gates — same rules as SidebarCustomize.
    if (plan !== 'business' && features.map_library === MAP_LIBRARY_MAPBOX) {
        errors.map_library = 'Mapbox is only available on the Business plan';
    }
    // Leaflet has no 3D mode, so the flag is meaningless off Mapbox. Cleared
    // rather than rejected: it is a rendering hint, not a bad request.
    if (features.map_library !== MAP_LIBRARY_MAPBOX) {
        features.mapbox_3d = false;
    }
    if (plan === 'free' && settings.pin.type === 'custom') {
        errors['settings.pin.type'] = 'Custom pin is only available on Pro or Business plans';
    }
    if (plan === 'free' && settings.pin.image) {
        errors['settings.pin.image'] = 'Custom pin image is only available on Pro or Business plans';
    }
    if (plan !== 'business' && features.form_style !== 'style-1') {
        errors.form_style = 'Form style 2 and 3 are only available on the Business plan';
    }
    if (plan !== 'business') {
        features.powered_by_storefindy = true;
    }

    if (Object.keys(errors).length > 0) return { errors };

    const { focused_zoom, dynamic_search, ...restFeatures } = features;

    return {
        form: {
            settings,
            focused_zoom,
            dynamic_search,
            ...restFeatures,
        },
    };
}
