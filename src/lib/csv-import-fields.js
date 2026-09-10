// The optional CSV columns a location import understands, and the one parser
// that turns each of them into the exact type `locationSchema` declares.
//
// WHY THIS FILE EXISTS
// A CSV cell is always a string. Mongoose, on the other hand, wants a Boolean
// for `published`, an array of `{enabled, open, close}` for `hours`, an array of
// `{from, to, enabled, open, close}` for `holidays`, and so on. Casting is not
// enough either: mongoose would happily coerce the string "maybe" to `true` for
// a Boolean path, and silently write nonsense. So every optional column is
// parsed and validated here, BEFORE a document is built — a value that cannot be
// understood is never handed to mongoose, it is reported instead.
//
// Imported by both sides on purpose:
//   • the wizard (import-csv-client.js) — to show per-row warnings in the
//     preview, so the user is told exactly which cell is wrong and why;
//   • buildImportDocs() (import-csv.js) — which re-runs the same parse on the
//     server, because the browser's verdict is never trusted.
// One module, so a row the preview accepts is a row the server accepts.
//
// WHAT HAPPENS TO A BAD VALUE
// A bad *optional* value never fails the row — the row still imports, the field
// falls back to its schema default, and an issue is reported (a warning badge in
// the wizard, an entry in the API response). Required fields keep the old
// behaviour: a missing name/city/state/country or a non-numeric lat/lng skips
// the row entirely.
//
// FUTURE: AI clean-up (Transformers.js)
// Each parser returns `{ value }` or `{ error }` and never throws, and the issue
// list carries the machine-readable `field` alongside the human message. That is
// deliberately the shape a cleaning pass wants: run this parser first, feed the
// rows that came back with issues (plus `CSV_FIELD_HINTS[field]`, which states
// the expected format) to the model, then re-run this same parser on what it
// returns and only accept the row if the issue disappears. The model proposes;
// this file still decides.
import { SOCIAL_MEDIA_CODES, SOCIAL_MEDIA_HOSTS } from '@/utils/constant/social-media';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** The three values `location_status` may hold — same list as the Add Location form. */
export const LOCATION_STATUSES = ['open', 'temporarily_closed', 'coming_soon'];

// Fallback times for a day that is present but closed. The schema marks
// `open`/`close` required even when `enabled` is false, so they always need a value.
const DEFAULT_OPEN = '08:00';
const DEFAULT_CLOSE = '17:00';

// The schedule an imported location gets when the CSV says nothing about hours.
// Individual `hours_*` columns are merged over this, so a file that only fills
// in Saturday keeps sensible weekday hours.
export const DEFAULT_IMPORT_HOURS = {
    Mon: { enabled: true, open: DEFAULT_OPEN, close: DEFAULT_CLOSE },
    Tue: { enabled: true, open: DEFAULT_OPEN, close: DEFAULT_CLOSE },
    Wed: { enabled: true, open: DEFAULT_OPEN, close: DEFAULT_CLOSE },
    Thu: { enabled: true, open: DEFAULT_OPEN, close: DEFAULT_CLOSE },
    Fri: { enabled: true, open: DEFAULT_OPEN, close: DEFAULT_CLOSE },
    Sat: { enabled: true, open: DEFAULT_OPEN, close: DEFAULT_CLOSE },
    Sun: { enabled: false, open: DEFAULT_OPEN, close: DEFAULT_CLOSE },
};

/** CSV column -> day key in `hours`. One column per day keeps every cell flat and editable in Excel. */
export const CSV_DAY_COLUMNS = [
    ['hours_mon', 'Mon'],
    ['hours_tue', 'Tue'],
    ['hours_wed', 'Wed'],
    ['hours_thu', 'Thu'],
    ['hours_fri', 'Fri'],
    ['hours_sat', 'Sat'],
    ['hours_sun', 'Sun'],
];

/**
 * Size caps, matching the ones the REST API applies in `api-payloads.js`.
 * Mongoose enforces types but not sizes; without these one row could write a
 * multi-megabyte document that every locator read afterwards has to carry.
 */
const MAX_FILTERS = 100;
const MAX_FILTER_LENGTH = 120;
const MAX_HOLIDAYS = 100;
const MAX_SOCIAL_LINKS = 30;
const MAX_URL_LENGTH = 2000;
const MAX_NOTES_LENGTH = 5000;

/* --------------------------------------------------------------------- *
 * Column catalogue
 * ------------------------------------------------------------------ */

/**
 * Optional columns in the order they appear in the template. The first four are
 * the original ones (plain text, stored as given); the rest are the typed fields
 * this module parses.
 */
export const CSV_OPTIONAL_FIELDS = [
    'postal',
    'phone',
    'email',
    'website',
    'location_status',
    'filters',
    ...CSV_DAY_COLUMNS.map(([column]) => column),
    'holidays',
    'view_location_url',
    'social_media_links',
    'published',
    'show_opening_hours',
    'custom_notes',
];

/** The typed subset — the fields parseOptionalLocationFields() actually validates. */
const TYPED_FIELDS = new Set([
    'location_status',
    'filters',
    ...CSV_DAY_COLUMNS.map(([column]) => column),
    'holidays',
    'view_location_url',
    'social_media_links',
    'published',
    'show_opening_hours',
    'custom_notes',
]);

/** Short human name for a column — used in "Missing optional field(s): …" messages. */
export const CSV_FIELD_LABELS = {
    postal: 'Postal / ZIP code',
    phone: 'Phone number',
    email: 'Email address',
    website: 'Website URL',
    location_status: 'Location status',
    filters: 'Filters / categories',
    hours_mon: 'Monday hours',
    hours_tue: 'Tuesday hours',
    hours_wed: 'Wednesday hours',
    hours_thu: 'Thursday hours',
    hours_fri: 'Friday hours',
    hours_sat: 'Saturday hours',
    hours_sun: 'Sunday hours',
    holidays: 'Holiday / special hours',
    view_location_url: 'View location URL',
    social_media_links: 'Social media links',
    published: 'Published',
    show_opening_hours: 'Show opening hours',
    custom_notes: 'Custom notes',
};

/**
 * The accepted format for each column, stated the way the user has to write it.
 * Shown in the wizard's "Optional Columns" list, quoted back in error messages,
 * and the prompt material for the future AI clean-up pass.
 */
export const CSV_FIELD_HINTS = {
    postal: 'Postal / ZIP code',
    phone: 'Phone number',
    email: 'Email address',
    website: 'Website URL',
    location_status: `One of: ${LOCATION_STATUSES.join(', ')}`,
    filters: 'Locator filters, separated by | — must already exist on the locator',
    hours_mon: '08:00-17:00, closed, or 24 hours',
    hours_tue: '08:00-17:00, closed, or 24 hours',
    hours_wed: '08:00-17:00, closed, or 24 hours',
    hours_thu: '08:00-17:00, closed, or 24 hours',
    hours_fri: '08:00-17:00, closed, or 24 hours',
    hours_sat: '08:00-17:00, closed, or 24 hours',
    hours_sun: '08:00-17:00, closed, or 24 hours',
    holidays: '2026-12-24~2026-12-26~09:00-13:00, more separated by |',
    view_location_url: '"View location" link (http:// or https://)',
    social_media_links: 'facebook=https://… , more separated by |',
    published: 'true or false',
    show_opening_hours: 'true or false',
    custom_notes: 'Free text shown on the store card',
};

/** Header spellings that auto-map to a field on the wizard's mapping step. */
export const CSV_SYNONYMS = {
    postal: ['postal', 'postal_code', 'postalcode', 'zip', 'zipcode', 'zip_code', 'postcode', 'post_code'],
    phone: ['phone', 'phone_no', 'phone_number', 'tel', 'telephone', 'mobile'],
    email: ['email', 'email_addr', 'email_address', 'mail'],
    website: ['website', 'web', 'url', 'site', 'homepage'],
    location_status: ['location_status', 'status', 'store_status', 'state_of_business', 'business_status'],
    filters: ['filters', 'filter', 'categories', 'category', 'tags', 'tag', 'services'],
    hours_mon: ['hours_mon', 'mon', 'monday', 'monday_hours', 'hours_monday', 'mon_hours'],
    hours_tue: ['hours_tue', 'tue', 'tues', 'tuesday', 'tuesday_hours', 'hours_tuesday', 'tue_hours'],
    hours_wed: ['hours_wed', 'wed', 'wednesday', 'wednesday_hours', 'hours_wednesday', 'wed_hours'],
    hours_thu: ['hours_thu', 'thu', 'thur', 'thurs', 'thursday', 'thursday_hours', 'hours_thursday', 'thu_hours'],
    hours_fri: ['hours_fri', 'fri', 'friday', 'friday_hours', 'hours_friday', 'fri_hours'],
    hours_sat: ['hours_sat', 'sat', 'saturday', 'saturday_hours', 'hours_saturday', 'sat_hours'],
    hours_sun: ['hours_sun', 'sun', 'sunday', 'sunday_hours', 'hours_sunday', 'sun_hours'],
    holidays: ['holidays', 'holiday', 'special_hours', 'holiday_hours'],
    view_location_url: ['view_location_url', 'view_url', 'location_url', 'view_location', 'detail_url', 'store_url'],
    social_media_links: ['social_media_links', 'social_media', 'social', 'social_links', 'socials'],
    published: ['published', 'publish', 'is_published', 'active', 'visible', 'live'],
    show_opening_hours: ['show_opening_hours', 'show_hours', 'display_hours', 'show_business_hours'],
    custom_notes: ['custom_notes', 'notes', 'note', 'remarks', 'custom_note'],
};

/* --------------------------------------------------------------------- *
 * Primitive parsers — each returns a value or reports it can't
 * ------------------------------------------------------------------ */

/** Lower-cased, whitespace-collapsed view of a cell. */
const normalize = (raw) => String(raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Cut a value down for an error message so one huge cell can't flood the UI. */
const quote = (raw) => {
    const str = String(raw ?? '').trim().replace(/\s+/g, ' ');
    return `"${str.length > 40 ? `${str.slice(0, 40)}…` : str}"`;
};

/** Split a multi-value cell. Pipe is the documented separator; `;` is accepted too. */
const splitList = (raw) => String(raw ?? '').split(/[|;]/).map((part) => part.trim()).filter(Boolean);

const TRUE_WORDS = new Set(['true', 'yes', 'y', '1', 'on', 'published', 'public', 'visible', 'enabled', 'show']);
const FALSE_WORDS = new Set(['false', 'no', 'n', '0', 'off', 'unpublished', 'draft', 'private', 'hidden', 'disabled', 'hide']);

/**
 * A Boolean cell. Accepts a real boolean (the REST API sends JSON), a 0/1, or
 * any of the spellings above — and rejects everything else rather than letting
 * mongoose cast a stray word to `true`.
 */
function parseBooleanValue(raw) {
    if (typeof raw === 'boolean') return { value: raw };
    if (typeof raw === 'number') {
        if (raw === 1) return { value: true };
        if (raw === 0) return { value: false };
        return { error: true };
    }

    const str = normalize(raw);
    if (!str) return { value: undefined };
    if (TRUE_WORDS.has(str)) return { value: true };
    if (FALSE_WORDS.has(str)) return { value: false };
    return { error: true };
}

/** A clock time in any of `17:00`, `5pm`, `5:30 PM`, `08:00` — normalised to 24-hour `HH:MM`. */
function parseTimeOfDay(raw) {
    const str = normalize(raw).replace(/\./g, '').replace(/\s+/g, '');
    const match = /^(\d{1,2})(?::(\d{2}))?(am|pm)?$/.exec(str);
    if (!match) return null;

    let hour = Number(match[1]);
    const minute = match[2] === undefined ? 0 : Number(match[2]);
    const meridiem = match[3];

    if (minute > 59) return null;
    if (meridiem) {
        if (hour < 1 || hour > 12) return null;
        if (meridiem === 'am') hour = hour === 12 ? 0 : hour;
        else hour = hour === 12 ? 12 : hour + 12;
    } else if (hour > 23) {
        return null;
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** A calendar date, `YYYY-MM-DD`, checked for real-ness (2026-02-30 is not a date). */
function parseDate(raw) {
    const str = String(raw ?? '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (!match) return null;

    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return null;
    }
    return str;
}

/**
 * An absolute http(s) URL, length-capped. Relative URLs and other schemes —
 * `javascript:` above all — are rejected, since these values end up as `href`s
 * on the store card.
 */
function parseHttpUrl(raw) {
    const str = String(raw ?? '').trim();
    if (!str) return { error: 'is empty' };
    if (str.length > MAX_URL_LENGTH) return { error: `cannot exceed ${MAX_URL_LENGTH} characters` };

    let url;
    try {
        url = new URL(str);
    } catch {
        return { error: `${quote(str)} is not a valid URL — it must start with http:// or https://` };
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { error: `${quote(str)} is not a valid URL — it must start with http:// or https://` };
    }
    return { value: str };
}

const CLOSED_WORDS = new Set(['closed', 'close', 'off', 'none', 'no', 'n/a', 'na', '-', '--', '—']);
const ALL_DAY_WORDS = new Set(['24 hours', '24hours', '24h', '24hr', '24hrs', '24/7', 'open 24 hours', 'always open', 'open']);

/**
 * One day's opening hours: `08:00-17:00`, `8am - 5pm`, `closed`, or `24 hours`.
 * Returns the `{enabled, open, close}` sub-document daySchema requires.
 */
function parseDayHours(raw) {
    const str = normalize(raw);
    if (!str) return { value: undefined };
    if (CLOSED_WORDS.has(str)) return { value: { enabled: false, open: DEFAULT_OPEN, close: DEFAULT_CLOSE } };
    if (ALL_DAY_WORDS.has(str)) return { value: { enabled: true, open: '00:00', close: '23:59' } };

    const parts = str.split(/\s*(?:--|-|–|—|~|to)\s*/).filter(Boolean);
    if (parts.length !== 2) return { error: 'must look like 08:00-17:00, "closed", or "24 hours"' };

    const open = parseTimeOfDay(parts[0]);
    const close = parseTimeOfDay(parts[1]);
    if (!open || !close) return { error: 'must look like 08:00-17:00, "closed", or "24 hours"' };
    if (close <= open) {
        return { error: 'the closing time must be later than the opening time (use "24 hours" for a location that never closes)' };
    }

    return { value: { enabled: true, open, close } };
}

/** The same day, given as an object rather than a string — the shape the REST API posts. */
function parseDayObject(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'must be an object' };

    const enabled = parseBooleanValue(raw.enabled);
    if (enabled.error) return { error: `"enabled" must be true or false, got ${quote(raw.enabled)}` };

    const open = parseTimeOfDay(raw.open) ?? DEFAULT_OPEN;
    const close = parseTimeOfDay(raw.close) ?? DEFAULT_CLOSE;
    const isOpen = enabled.value ?? false;
    if (isOpen && (!parseTimeOfDay(raw.open) || !parseTimeOfDay(raw.close))) {
        return { error: 'an open day needs valid open and close times (HH:MM)' };
    }

    return { value: { enabled: isOpen, open, close } };
}

/* --------------------------------------------------------------------- *
 * Field parsers
 * ------------------------------------------------------------------ */

const STATUS_ALIASES = {
    open: 'open',
    opened: 'open',
    active: 'open',
    operating: 'open',
    operational: 'open',
    temporarily_closed: 'temporarily_closed',
    temporary_closed: 'temporarily_closed',
    temp_closed: 'temporarily_closed',
    closed: 'temporarily_closed',
    coming_soon: 'coming_soon',
    opening_soon: 'coming_soon',
    soon: 'coming_soon',
};

function parseLocationStatus(raw) {
    const key = normalize(raw).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!key) return { value: undefined };

    const status = STATUS_ALIASES[key];
    if (!status) {
        return { error: `${quote(raw)} is not a location status — use one of: ${LOCATION_STATUSES.join(', ')}` };
    }
    return { value: status };
}

/**
 * Filters are the locator's own categories, so an imported value only means
 * something if the locator already defines it — the widget's filter bar is built
 * from `locator.filters`, and a location tagged with anything else can never be
 * filtered to. Matching is case-insensitive and the locator's own spelling wins.
 *
 * `allowedFilters` of null means "unknown" (no locator context): values are then
 * accepted as-is, deduped and capped.
 */
function parseFilters(raw, allowedFilters) {
    const list = Array.isArray(raw)
        ? raw.map((item) => String(item ?? '').trim()).filter(Boolean)
        : String(raw ?? '').split(/[|;,]/).map((part) => part.trim()).filter(Boolean);

    if (list.length === 0) return { value: undefined };
    if (list.length > MAX_FILTERS) return { error: `cannot hold more than ${MAX_FILTERS} filters` };

    const lookup = allowedFilters
        ? new Map(allowedFilters.map((filter) => [String(filter).trim().toLowerCase(), String(filter).trim()]))
        : null;

    const values = [];
    const unknown = [];
    for (const item of list) {
        if (item.length > MAX_FILTER_LENGTH) {
            return { error: `a filter cannot exceed ${MAX_FILTER_LENGTH} characters` };
        }
        if (lookup) {
            const match = lookup.get(item.toLowerCase());
            if (!match) {
                unknown.push(item);
                continue;
            }
            if (!values.includes(match)) values.push(match);
        } else if (!values.includes(item)) {
            values.push(item);
        }
    }

    if (unknown.length) {
        const known = allowedFilters.length
            ? `this locator's filters are: ${allowedFilters.join(', ')}`
            : 'this locator has no filters defined yet — add them under Edit Locator first';
        return {
            value: values.length ? values : undefined,
            error: `${unknown.map(quote).join(', ')} ${unknown.length === 1 ? 'is not a filter on' : 'are not filters on'} this locator — ${known}`,
        };
    }

    return { value: values.length ? values : undefined };
}

/**
 * Holiday / special hours.
 *
 * String form — entries separated by `|`, fields inside an entry by `~`:
 *   2026-12-24~2026-12-26~09:00-13:00   (a range, open reduced hours)
 *   2026-12-25~closed                   (a single day, closed)
 * `~` is used inside an entry precisely because the times already contain `:`
 * and the cell itself already uses `|`.
 *
 * Array form — the `{from, to, enabled, open, close}` objects the REST API posts.
 */
function parseHolidays(raw) {
    const entries = Array.isArray(raw) ? raw : splitList(raw);
    if (entries.length === 0) return { value: undefined };
    if (entries.length > MAX_HOLIDAYS) return { error: `cannot hold more than ${MAX_HOLIDAYS} holidays` };

    // One malformed entry doesn't discard the rest of the cell: the good ones
    // are kept and every bad one is named, so the user fixes exactly what broke.
    const values = [];
    const errors = [];
    for (const entry of entries) {
        const parsed = typeof entry === 'string' ? parseHolidayString(entry) : parseHolidayObject(entry);
        if (parsed.error) errors.push(parsed.error);
        else values.push(parsed.value);
    }

    return {
        value: values.length ? values : undefined,
        error: errors.length ? errors.join('; ') : undefined,
    };
}

const HOLIDAY_FORMAT = 'each entry must look like 2026-12-24~2026-12-26~09:00-13:00 or 2026-12-25~closed';

function parseHolidayString(entry) {
    const parts = entry.split('~').map((part) => part.trim()).filter(Boolean);
    if (parts.length !== 2 && parts.length !== 3) return { error: `${quote(entry)} — ${HOLIDAY_FORMAT}` };

    const from = parseDate(parts[0]);
    const to = parts.length === 3 ? parseDate(parts[1]) : from;
    if (!from || !to) return { error: `${quote(entry)} — dates must be real calendar dates in YYYY-MM-DD form` };
    if (to < from) return { error: `${quote(entry)} — the "to" date must be on or after the "from" date` };

    const hours = parseDayHours(parts[parts.length - 1]);
    if (hours.error || !hours.value) return { error: `${quote(entry)} — ${HOLIDAY_FORMAT}` };

    return { value: { from, to, ...hours.value } };
}

function parseHolidayObject(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { error: 'each holiday must be an object' };

    const from = parseDate(entry.from);
    const to = parseDate(entry.to) ?? from;
    if (!from || !to) return { error: 'each holiday needs "from" and "to" dates in YYYY-MM-DD form' };
    if (to < from) return { error: 'a holiday\'s "to" date must be on or after its "from" date' };

    const day = parseDayObject(entry);
    if (day.error) return { error: `holiday ${from}: ${day.error}` };

    return { value: { from, to, ...day.value } };
}

/** Match a bare URL to a network by hostname, so `https://facebook.com/x` needs no `facebook=` prefix. */
function inferSocialCode(url) {
    let host;
    try {
        host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
        return '';
    }

    for (const [domain, code] of Object.entries(SOCIAL_MEDIA_HOSTS)) {
        if (host === domain || host.endsWith(`.${domain}`)) return code;
    }
    return '';
}

/**
 * Social media links.
 *
 * String form — `facebook=https://facebook.com/mystore | instagram=https://…`.
 * The network may be left out when the domain gives it away, so a bare
 * `https://www.facebook.com/mystore` also works.
 *
 * Array form — the `{code, link}` objects the REST API posts.
 */
function parseSocialMediaLinks(raw) {
    const entries = Array.isArray(raw) ? raw : splitList(raw);
    if (entries.length === 0) return { value: undefined };
    if (entries.length > MAX_SOCIAL_LINKS) return { error: `cannot hold more than ${MAX_SOCIAL_LINKS} links` };

    // As with holidays: keep the links that are fine, name the ones that aren't.
    const values = [];
    const errors = [];
    for (const entry of entries) {
        let code;
        let link;

        if (typeof entry === 'string') {
            // Split on the FIRST `=` only — the URL after it may contain more.
            const at = entry.indexOf('=');
            code = at === -1 ? '' : entry.slice(0, at).trim().toLowerCase();
            link = at === -1 ? entry.trim() : entry.slice(at + 1).trim();
            if (!code) code = inferSocialCode(link);
        } else if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            code = String(entry.code ?? '').trim().toLowerCase();
            link = String(entry.link ?? '').trim();
            if (!code) code = inferSocialCode(link);
        } else {
            errors.push('each link must be a string or a { code, link } object');
            continue;
        }

        const url = parseHttpUrl(link);
        if (url.error) {
            errors.push(url.error);
            continue;
        }
        if (!code) {
            errors.push(`${quote(link)} doesn't say which network it is — write it as facebook=${link}`);
            continue;
        }
        if (!SOCIAL_MEDIA_CODES.includes(code)) {
            errors.push(`${quote(code)} is not a supported network — use one of: ${SOCIAL_MEDIA_CODES.join(', ')}`);
            continue;
        }
        // Last one wins, so a file that repeats a network doesn't render two icons.
        const existing = values.findIndex((item) => item.code === code);
        if (existing === -1) values.push({ code, link: url.value });
        else values[existing] = { code, link: url.value };
    }

    return {
        value: values.length ? values : undefined,
        error: errors.length ? errors.join('; ') : undefined,
    };
}

/* --------------------------------------------------------------------- *
 * The one entry point
 * ------------------------------------------------------------------ */

/**
 * Parse every typed optional column on one mapped CSV row.
 *
 * Accepts both the wizard's shape (every cell a string, hours split across
 * `hours_mon`…`hours_sun`) and the REST API's shape (real booleans, arrays, and
 * a whole `hours` object), so the same call serves both callers.
 *
 * Nothing throws and nothing is fatal: a column that can't be understood is left
 * out of `values` — the caller then falls back to the schema default — and the
 * reason lands in `issues`.
 *
 * @param {object} raw Mapped row: `{ [csv field]: value }`.
 * @param {{ allowedFilters?: string[]|null }} options `allowedFilters` is the
 *   target locator's own filter list; null means "not known here", which lets
 *   any filter value through.
 * @returns {{ values: object, issues: Array<{field: string, message: string}> }}
 *   `values` holds only the fields that parsed, keyed by MODEL field name
 *   (`hours`, not `hours_mon`), ready to spread into a location document.
 */
export function parseOptionalLocationFields(raw = {}, { allowedFilters = null } = {}) {
    const values = {};
    const issues = [];
    const report = (field, message) => issues.push({ field, message: `${CSV_FIELD_LABELS[field] ?? field}: ${message}` });

    const status = parseLocationStatus(raw.location_status);
    if (status.error) report('location_status', status.error);
    else if (status.value !== undefined) values.location_status = status.value;

    if (raw.filters !== undefined && raw.filters !== '') {
        const filters = parseFilters(raw.filters, allowedFilters);
        if (filters.error) report('filters', filters.error);
        if (filters.value !== undefined) values.filters = filters.value;
    }

    // Hours: the seven day columns are merged over the default schedule, so a
    // file that only fills in some days still produces the complete week the
    // schema requires. A whole `hours` object (REST) is read first, then the
    // per-day columns override it.
    let hours = null;
    if (raw.hours && typeof raw.hours === 'object' && !Array.isArray(raw.hours)) {
        for (const day of DAYS) {
            if (raw.hours[day] === undefined) continue;

            const parsed = parseDayObject(raw.hours[day]);
            if (parsed.error) issues.push({ field: 'hours', message: `${day} hours: ${parsed.error}` });
            else {
                hours = hours ?? {};
                hours[day] = parsed.value;
            }
        }
    }
    for (const [column, day] of CSV_DAY_COLUMNS) {
        if (raw[column] === undefined) continue;

        const parsed = parseDayHours(raw[column]);
        if (parsed.error) report(column, `${quote(raw[column])} ${parsed.error}`);
        else if (parsed.value !== undefined) {
            hours = hours ?? {};
            hours[day] = parsed.value;
        }
    }
    if (hours) values.hours = { ...DEFAULT_IMPORT_HOURS, ...hours };

    // Holidays and social links report per-entry, so a cell can both contribute
    // valid entries and carry a complaint about the ones it couldn't read.
    if (raw.holidays !== undefined && raw.holidays !== '') {
        const holidays = parseHolidays(raw.holidays);
        if (holidays.error) report('holidays', holidays.error);
        if (holidays.value !== undefined) values.holidays = holidays.value;
    }

    if (raw.view_location_url !== undefined && String(raw.view_location_url).trim() !== '') {
        const url = parseHttpUrl(raw.view_location_url);
        if (url.error) report('view_location_url', url.error);
        else values.view_location_url = url.value;
    }

    if (raw.social_media_links !== undefined && raw.social_media_links !== '') {
        const links = parseSocialMediaLinks(raw.social_media_links);
        if (links.error) report('social_media_links', links.error);
        if (links.value !== undefined) values.social_media_links = links.value;
    }

    for (const field of ['published', 'show_opening_hours']) {
        const parsed = parseBooleanValue(raw[field]);
        if (parsed.error) report(field, `${quote(raw[field])} is not true or false`);
        else if (parsed.value !== undefined) values[field] = parsed.value;
    }

    const notes = String(raw.custom_notes ?? '').trim();
    if (notes.length > MAX_NOTES_LENGTH) {
        report('custom_notes', `cannot exceed ${MAX_NOTES_LENGTH} characters (this row has ${notes.length})`);
    } else if (notes) {
        values.custom_notes = notes;
    }

    return { values, issues };
}

/** True when `field` is one of the columns parseOptionalLocationFields() validates. */
export const isTypedOptionalField = (field) => TYPED_FIELDS.has(field);

/* --------------------------------------------------------------------- *
 * Template
 * ------------------------------------------------------------------ */

/** Quote a cell only when it needs it, so the template stays readable in a text editor. */
function csvCell(value) {
    const str = String(value ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Join one row of values into a CSV line. */
export const toCsvRow = (values) => values.map(csvCell).join(',');

/**
 * Build the downloadable template: the header, then the sample rows.
 * Required columns come first and in their original order — an existing file
 * built from the old template still maps cleanly.
 *
 * @param {string[]} columns Header, required columns first.
 * @param {Array<object>} rows Sample rows keyed by column name.
 */
export function buildCsvTemplate(columns, rows) {
    return [toCsvRow(columns), ...rows.map((row) => toCsvRow(columns.map((column) => row[column] ?? '')))].join('\n');
}
