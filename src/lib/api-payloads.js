// JSON request-body validation for the REST API under /api/v1.
//
// The dashboard server actions validate `FormData`; these schemas apply the
// same rules to a JSON body, keyed by the model's own field names so requests
// and responses are symmetric. Error shape matches the actions:
// `{ status: 'error', errors: { field: message } }`.
import { z } from 'zod';
import { isObjectIdString, readBoundedText, sanitizeMongoInput, LIMITS } from '@/lib/api-sanitize';

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
 * @param {{ maxBytes?: number }} options `maxBytes` raises the size gate for a
 *   route that legitimately carries more than one record — see the CSV import.
 *   The structural limits in sanitizeMongoInput() still apply either way.
 */
export async function readJsonBody(request, { maxBytes = LIMITS.bodyBytes } = {}) {
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

    const { value, error } = sanitizeMongoInput(parsed);
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
