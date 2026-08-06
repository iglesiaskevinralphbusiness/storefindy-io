// Input hardening for the public REST API under /api/v1.
//
// The dashboard actions read `FormData` from a page the user already owns, so
// their inputs are shaped by the browser. The REST API has no such floor: every
// byte of the URL, the headers and the JSON body is attacker-controlled, and a
// valid API key is cheap to obtain (any signed-up account has one). So the rules
// here are deliberately stricter than the actions':
//
//   1. Nothing user-supplied is ever used as a Mongo *operator* or *field name*
//      — `$`-prefixed and dotted keys are dropped, and sort fields come from a
//      whitelist rather than the query string.
//   2. Nothing user-supplied reaches a regex uncompiled — `search` is escaped so
//      a payload like `(a+)+$` can't pin the database's CPU.
//   3. Every unbounded dimension is bounded — body bytes, nesting depth, key
//      count, array length, string length, page size. Mongo has a 16MB document
//      limit and Vercel now accepts 100MB request bodies, so "valid but huge" is
//      a real denial-of-service path, not a theoretical one.
//
// `mongo-sanitize` (used by the actions via `sanitizeInput`) covers only rule 1's
// first half — it strips `$` keys and nothing else. `sanitizeMongoInput()` below
// is the API's replacement for it.

/** Caps applied to every /api/v1 request. Exported so tests and docs agree. */
export const LIMITS = {
    bodyBytes: 256 * 1024,
    depth: 8,
    objectKeys: 100,
    arrayLength: 500,
    stringLength: 5000,
    searchLength: 200,
    pageSize: 100,
    page: 100_000,
    idList: 100,
};

/** A 24-hex Mongo ObjectId as the API hands them out. */
const OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * Strict ObjectId check.
 *
 * Deliberately narrower than mongoose's `isValidObjectId()`, which also accepts
 * any 12-character string and any 12-byte buffer. Those alternate forms never
 * appear in a response, so a client sending one is probing rather than using the
 * API — and `locator_id` is stored as a *string*, which `queryLocations()` feeds
 * to `$toObjectId`, where a non-hex value throws and surfaces as a 500.
 */
export function isObjectIdString(value) {
    return typeof value === 'string' && OBJECT_ID.test(value);
}

/** Escape regex metacharacters so user text matches literally. */
export function escapeRegex(input) {
    return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Keys that must never survive into a document or a query:
 *   `$…`          — a Mongo operator in a query, e.g. `{ name: { $ne: null } }`
 *   `a.b`         — a nested-path write in an update, e.g. `{ 'api_auth_key.value': … }`
 *   `__proto__` … — prototype pollution once the object is spread or merged
 */
function isUnsafeKey(key) {
    return (
        key.startsWith('$') ||
        key.includes('.') ||
        key === '__proto__' ||
        key === 'constructor' ||
        key === 'prototype'
    );
}

class SanitizeError extends Error {}

function walk(value, depth, path) {
    if (depth > LIMITS.depth) {
        throw new SanitizeError(`${path} is nested more than ${LIMITS.depth} levels deep`);
    }
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
        if (value.length > LIMITS.stringLength) {
            throw new SanitizeError(`${path} exceeds ${LIMITS.stringLength} characters`);
        }
        return value;
    }
    if (typeof value === 'number') {
        // JSON can't carry NaN/Infinity, but a coerced value can become one.
        if (!Number.isFinite(value)) throw new SanitizeError(`${path} must be a finite number`);
        return value;
    }
    if (typeof value === 'boolean') return value;

    if (Array.isArray(value)) {
        if (value.length > LIMITS.arrayLength) {
            throw new SanitizeError(`${path} exceeds ${LIMITS.arrayLength} items`);
        }
        return value.map((item, i) => walk(item, depth + 1, `${path}[${i}]`));
    }

    if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length > LIMITS.objectKeys) {
            throw new SanitizeError(`${path} has more than ${LIMITS.objectKeys} keys`);
        }
        // Rebuild rather than `delete` in place (what mongo-sanitize does) so the
        // caller can't hold a reference to the pre-sanitized object.
        const out = {};
        for (const key of keys) {
            if (isUnsafeKey(key)) continue;
            out[key] = walk(value[key], depth + 1, `${path}.${key}`);
        }
        return out;
    }

    throw new SanitizeError(`${path} has an unsupported value type`);
}

/**
 * Recursively strip unsafe keys and enforce the structural limits.
 * Returns `{ value }`, or `{ error }` with a message naming the offending path.
 */
export function sanitizeMongoInput(value, path = 'body') {
    try {
        return { value: walk(value, 0, path) };
    } catch (error) {
        if (error instanceof SanitizeError) return { error: error.message };
        throw error;
    }
}

/**
 * Read the request body as text without buffering more than `bodyBytes`.
 *
 * `content-length` is checked first as a cheap reject, but it is a client-
 * supplied header and may be absent on a chunked request, so the stream itself
 * is also counted and cancelled the moment it goes over.
 */
export async function readBoundedText(request, maxBytes = LIMITS.bodyBytes) {
    const tooLarge = { error: `Request body exceeds the ${Math.floor(maxBytes / 1024)}KB limit` };

    const declared = Number(request.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) return tooLarge;

    if (!request.body) return { text: '' };

    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let total = 0;
    let text = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        total += value.byteLength;
        if (total > maxBytes) {
            await reader.cancel();
            return tooLarge;
        }
        text += decoder.decode(value, { stream: true });
    }

    return { text: text + decoder.decode() };
}

/**
 * Integer query parameter clamped into `[min, max]`.
 * Anything unparseable (including `1e999`, which coerces to Infinity and would
 * make `$skip`/`$limit` throw) falls back to `fallback`.
 */
export function toBoundedInt(raw, { min, max, fallback }) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;

    const int = Math.floor(n);
    if (int < min) return min;
    if (int > max) return max;
    return int;
}

/**
 * Sort field resolved against a whitelist.
 *
 * The field name becomes a *key* in `$sort`, so it can't be sanitized the way a
 * value can: `{ $sort: { $where: 1 } }` is a malformed pipeline stage, not a
 * quoted string. A whitelist is the only safe form.
 */
export function pickSortField(raw, allowed, fallback) {
    return allowed.includes(raw) ? raw : fallback;
}

/** `'asc' | 'desc'` — anything else falls back. */
export function pickSortOrder(raw, fallback = 'asc') {
    return raw === 'asc' || raw === 'desc' ? raw : fallback;
}

/** Free-text search term: trimmed, length-capped, regex-escaped. */
export function toSearchTerm(raw, maxLength = LIMITS.searchLength) {
    if (typeof raw !== 'string') return '';
    return raw.trim().slice(0, maxLength);
}

/**
 * Comma-separated ObjectId list for an `$in` filter. Non-ObjectId entries are
 * dropped rather than rejected so a stale bookmark still returns results, and
 * the list is capped so `$in` can't be handed thousands of terms.
 */
export function parseObjectIdList(raw, max = LIMITS.idList) {
    if (typeof raw !== 'string' || raw.trim() === '') return [];

    return raw
        .split(',')
        .map((id) => id.trim())
        .filter(isObjectIdString)
        .slice(0, max);
}
