// Deterministic clean-up for the plain-text CSV columns.
//
// Every rule here either *removes* noise or *reformats* characters that are
// already in the cell. None of them adds information: a missing phone number
// stays missing, a partial URL is completed only with a scheme (never a
// hostname), and a value that has genuinely lost data — an Excel-mangled phone
// number, say — is reported rather than reconstructed from a guess.
//
// Each cleaner returns `{ value, note }`. `note` is set only when the value
// actually changed or when the merchant needs to look at the cell, and it is
// what the preview shows next to the before/after pair.

/** Placeholders that mean "no value" and should become an empty cell. */
const EMPTY_WORDS = new Set([
    'n/a', 'na', 'n.a.', '-', '--', '—', 'none', 'null', 'nil', 'tbd', 'tba',
    'unknown', 'not available', 'not applicable', 'no data', '#n/a', 'undefined',
]);

const collapse = (raw) => String(raw ?? '').replace(/\s+/g, ' ').trim();

/** True when the cell is one of the "no value" placeholders. */
const isPlaceholder = (value) => EMPTY_WORDS.has(value.toLowerCase());

const unchanged = (value) => ({ value, note: '' });

/**
 * Trim, collapse runs of whitespace, and blank out placeholder words. Applied
 * to every text column before its own cleaner runs.
 */
export function cleanText(raw) {
    const value = collapse(raw);
    if (!value) return unchanged('');
    if (isPlaceholder(value)) return { value: '', note: 'placeholder value cleared' };
    if (value !== String(raw ?? '')) return { value, note: 'trimmed' };
    return unchanged(value);
}

/**
 * Store, city, state and street names.
 *
 * A fully-uppercase value is re-cased, because a CSV exported from a
 * point-of-sale system routinely shouts and the widget renders the name as
 * given. Mixed case is never touched — "iPhone Repair NYC" is how the merchant
 * spelled it, and second-guessing that would be a change they didn't ask for.
 */
export function cleanName(raw) {
    const base = cleanText(raw);
    if (!base.value) return base;

    const value = base.value;
    const letters = value.replace(/[^a-z]/gi, '');
    if (letters.length >= 4 && value === value.toUpperCase() && value !== value.toLowerCase()) {
        return { value: toTitleCase(value), note: 'ALL CAPS re-cased' };
    }
    return base;
}

/** Small words that stay lowercase inside a name, and initialisms that stay up. */
const LOWER_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'de', 'del', 'for', 'in', 'la', 'of', 'on', 'or', 'the', 'to', 'van', 'von']);
const KEEP_UPPER = new Set(['us', 'usa', 'uk', 'ii', 'iii', 'iv', 'ne', 'nw', 'se', 'sw', 'llc', 'ltd', 'inc', 'bbq', 'atm', 'hq']);

function toTitleCase(value) {
    return value.toLowerCase().split(' ').map((word, index) => {
        const bare = word.replace(/[^a-z]/g, '');
        if (KEEP_UPPER.has(bare)) return word.toUpperCase();
        // A short vowel-less token is an initialism, not a word — "SM", "BBQ",
        // "NW". Lower-casing those is the one way this rule could damage a
        // brand name, so they keep the capitals they arrived with.
        if (bare.length > 0 && bare.length <= 4 && !/[aeiouy]/.test(bare)) return word.toUpperCase();
        if (index > 0 && LOWER_WORDS.has(bare)) return word;
        // Capitalise after an apostrophe or hyphen too: "o'brien" -> "O'Brien".
        return word.replace(/(^|[-'’])([a-z])/g, (full, prefix, letter) => prefix + letter.toUpperCase());
    }).join(' ');
}

/**
 * Phone numbers.
 *
 * Punctuation is tidied and duplicate separators collapsed; the digits
 * themselves are never altered and no country code is ever added — a merchant's
 * local-format number is correct for their customers, and prefixing it with a
 * guess would make it dial the wrong place.
 */
export function cleanPhone(raw) {
    const base = cleanText(raw);
    if (!base.value) return base;

    // Excel turns a long numeric-looking phone into scientific notation on
    // export, which destroys the trailing digits. That is unrecoverable, so the
    // cell is left exactly as-is and flagged for the merchant to re-export.
    if (/^\d(?:\.\d+)?e\+?\d+$/i.test(base.value.replace(/\s/g, ''))) {
        return { value: base.value, note: 'looks like Excel converted this to a number — the original digits are lost, re-export this column as text' };
    }

    let value = base.value
        .replace(/^tel:\s*/i, '')
        .replace(/[^\d+()\-.\s/x,#]/gi, '')      // drop letters and stray symbols
        .replace(/\s*([()\-.])\s*/g, '$1')        // no spaces hugging punctuation
        .replace(/([-.]){2,}/g, '$1')             // collapse repeated separators
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[-.]+|[-.]+$/g, '');

    // A leading "00" international prefix is the same number as a leading "+".
    if (/^00\d/.test(value)) value = `+${value.slice(2)}`;

    if (!/\d/.test(value)) return { value: '', note: 'no digits — cleared' };
    if (value === base.value) return base;
    return { value, note: 'formatting tidied' };
}

/** Email addresses: case-folded and stripped of a `mailto:` prefix. */
export function cleanEmail(raw) {
    const base = cleanText(raw);
    if (!base.value) return base;

    const value = base.value.replace(/^mailto:\s*/i, '').replace(/\s/g, '').toLowerCase();
    if (!value.includes('@')) return { value, note: 'this does not look like an email address' };
    if (value === base.value) return base;
    return { value, note: 'normalised' };
}

/**
 * URLs.
 *
 * The only thing ever added is the scheme — `example.com/store` becomes
 * `https://example.com/store`, which is what a browser would do anyway and what
 * parseHttpUrl() in csv-import-fields.js requires. A cell that isn't a URL at
 * all is left alone and reported; nothing is fabricated from the store's name.
 */
export function cleanUrl(raw) {
    const base = cleanText(raw);
    if (!base.value) return base;

    let value = base.value.replace(/\s/g, '');

    // A protocol-relative URL, and the common `htp://` / `https//` typos.
    value = value
        .replace(/^\/\//, 'https://')
        // Common hand-typed scheme mistakes: `htp://`, `https//`, `http:/`.
        .replace(/^h?t{1,2}ps?:?\/{1,2}/i, (match) => (/s/i.test(match) ? 'https://' : 'http://'));

    if (!/^https?:\/\//i.test(value)) {
        // Only prefix something that actually looks like a hostname.
        if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$|\?|#)/i.test(value)) {
            return { value: base.value, note: 'this does not look like a web address' };
        }
        value = `https://${value}`;
    }

    try {
        // Round-tripping through URL normalises the host's case and encoding.
        const url = new URL(value);
        url.hostname = url.hostname.toLowerCase();
        // `new URL()` appends a "/" to a bare origin. Dropping it again keeps
        // the value the merchant would recognise, and parseHttpUrl() accepts
        // either form.
        value = (url.pathname === '/' && !url.search && !url.hash)
            ? `${url.protocol}//${url.host}`
            : url.toString();
    } catch {
        return { value: base.value, note: 'this does not look like a web address' };
    }

    if (value === base.value) return base;
    if (/^https?:\/\//i.test(base.value)) return { value, note: 'normalised' };
    // Distinguish "there was no scheme" from "the scheme was misspelled", so
    // the preview's note matches what the merchant sees change.
    return { value, note: /^[a-z]*:?\/\//i.test(base.value) ? 'scheme corrected' : 'added https://' };
}

/** Postal codes: whitespace collapsed and letters upper-cased (UK, CA, NL). */
export function cleanPostal(raw) {
    const base = cleanText(raw);
    if (!base.value) return base;

    const value = base.value.toUpperCase().replace(/\s+/g, ' ');
    if (value === base.value) return base;
    return { value, note: 'formatting tidied' };
}

/** Coordinates: strip degree symbols and thousands separators, keep the number. */
export function cleanCoordinate(raw) {
    const base = cleanText(raw);
    if (!base.value) return base;

    // A decimal comma ("14,5353") is a European export, not a thousands mark:
    // coordinates never have a thousands group, so a lone comma is a point.
    let value = base.value.replace(/[°\s]/g, '');
    if (/^-?\d{1,3},\d+$/.test(value)) value = value.replace(',', '.');

    // Trailing N/S/E/W hemisphere letters.
    const hemisphere = /^(-?[\d.]+)\s*([nsew])$/i.exec(value);
    if (hemisphere) {
        const sign = /[sw]/i.test(hemisphere[2]) ? -1 : 1;
        value = String(sign * Number(hemisphere[1]));
    }

    if (!Number.isFinite(Number(value))) return { value: base.value, note: 'this is not a number' };
    if (value === base.value) return base;
    return { value, note: 'formatting tidied' };
}

/** Free-text notes and descriptions: whitespace only, content untouched. */
export const cleanNotes = cleanText;

/**
 * The cleaner that runs for each CSV field, by field name. Fields absent from
 * this map are passed through cleanText() — trimmed, never rewritten.
 */
export const FIELD_CLEANERS = {
    name: cleanName,
    street: cleanName,
    city: cleanName,
    state: cleanName,
    postal: cleanPostal,
    phone: cleanPhone,
    email: cleanEmail,
    website: cleanUrl,
    view_location_url: cleanUrl,
    lat: cleanCoordinate,
    lng: cleanCoordinate,
    custom_notes: cleanNotes,
};

/** Clean one cell for one field. */
export function cleanField(field, value) {
    return (FIELD_CLEANERS[field] ?? cleanText)(value);
}
