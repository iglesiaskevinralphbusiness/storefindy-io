// JSON request-body validation for the REST API under /api/v1.
//
// The dashboard server actions validate `FormData`; these schemas apply the
// same rules to a JSON body, keyed by the model's own field names so requests
// and responses are symmetric. Error shape matches the actions:
// `{ status: 'error', errors: { field: message } }`.
import { z } from 'zod';
import { sanitizeInput } from '@/utils/lib/input-sanitization';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
 * Returns `{ body }` or `{ errors }` when the payload isn't a JSON object.
 */
export async function readJsonBody(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return { errors: { body: 'Request body must be valid JSON' } };
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { errors: { body: 'Request body must be a JSON object' } };
    }
    // Strip $-prefixed keys before anything reaches a Mongo query.
    return { body: sanitizeInput(body) };
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
        const name = String(body.name ?? '').trim();
        // Same rule the dashboard applies: a locator must have a name.
        if (name === '') {
            errors.name = 'Locator name is required';
        } else {
            form.name = name;
        }
    }

    const numeric = {
        default_zoom_level: 'Default zoom level',
        search_radius: 'Search radius',
        maximum_results_shown: 'Maximum results shown',
    };

    for (const field of LOCATOR_FIELDS) {
        const provided = body[field] !== undefined;

        if (!provided) {
            if (!partial) form[field] = LOCATOR_DEFAULTS[field];
            continue;
        }

        if (field in numeric) {
            const parsed = z.coerce.number().safeParse(body[field]);
            if (!parsed.success) {
                errors[field] = `${numeric[field]} must be a number`;
                continue;
            }
            form[field] = parsed.data;
        } else if (typeof LOCATOR_DEFAULTS[field] === 'boolean') {
            form[field] = Boolean(body[field]);
        } else if (field === 'filters') {
            if (!Array.isArray(body.filters)) {
                errors.filters = 'Filters must be an array';
                continue;
            }
            form.filters = body.filters;
        } else {
            form[field] = String(body[field] ?? '').trim();
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
        if (body[field] !== undefined) form[field] = String(body[field] ?? '').trim();
    }
    for (const field of LOCATION_BOOLEANS) {
        if (body[field] !== undefined) form[field] = Boolean(body[field]);
    }
    if (body.filters !== undefined) {
        if (!Array.isArray(body.filters)) errors.filters = 'Filters must be an array';
        else form.filters = body.filters;
    }
    if (body.holidays !== undefined) {
        if (!Array.isArray(body.holidays)) errors.holidays = 'Holidays must be an array';
        else form.holidays = body.holidays;
    }
    if (body.social_media_links !== undefined) {
        form.social_media_links = Array.isArray(body.social_media_links)
            ? body.social_media_links
                .map((item) => ({ code: String(item?.code ?? '').trim(), link: String(item?.link ?? '').trim() }))
                .filter((item) => item.code && item.link)
            : [];
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
    const hours = body.hours;
    if (!partial || hours !== undefined) {
        for (const day of DAYS) {
            const d = hours?.[day];
            if (!d || typeof d.enabled !== 'boolean') {
                errors.hours = 'Business hours are required for every day';
                break;
            }
            if (d.enabled && (!d.open || !d.close)) {
                errors.hours = 'Open and close times are required for enabled days';
                break;
            }
        }
        if (!errors.hours && hours !== undefined) form.hours = hours;
    }

    if (Object.keys(errors).length > 0) return { errors };
    return { form };
}
