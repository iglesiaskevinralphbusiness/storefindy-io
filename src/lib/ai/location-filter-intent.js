'use client';
// Reads a merchant's sentence on the Locations page into the filter triples
// defined by ./location-filter.js.
//
// Kept apart from that module on purpose: this half imports the AI worker and
// only ever runs in the browser, while location-filter.js (the catalogue, the
// Zod schema and the URL codec) is also imported by the server-side query
// builder. One file for the contract, one for the interpretation.
//
// The rules below resolve every published/active/status/place phrasing on their
// own. The model is asked exactly one question: which of *this locator's own
// filters* did the merchant mean when they wrote "free wifi" or "wheelchair
// access"? That is a ranking over a list the account already owns, so it can
// surface the wrong existing tag at worst — never a tag that doesn't exist.
import { embedTexts } from './worker-client';
import { rank } from './vector';
import { locationFilterListSchema, filterFieldByName } from './location-filter';

/** Similarity floor for matching a written amenity to a locator filter. */
const TAG_THRESHOLD = 0.55;

/* --------------------------------------------------------------------- *
 * Keyword rules
 * ------------------------------------------------------------------ */

const NEGATION = /\b(not|isn'?t|aren'?t|no longer|without|excluding|except|other than|non)\b/;

/** published — the flag on the location document. */
const PUBLISHED_FALSE = /\b(unpublished|not published|un-?published|draft|drafts|hidden|private|offline)\b/;
const PUBLISHED_TRUE = /\b(published|live|public|visible|online)\b/;

/** status — derived from the plan limit, not stored. `inactive` is tested first. */
const STATUS_INACTIVE = /\b(inactive|in-active|over (?:the |my )?(?:plan )?limit|disabled by (?:the )?plan|beyond (?:the |my )?limit)\b/;
const STATUS_ACTIVE = /\bactive\b/;

/** location_status — the merchant-set trading state. */
const LOC_STATUS = [
    [/\b(coming soon|opening soon|not open yet|due to open)\b/, 'coming_soon'],
    [/\b(temporarily closed|temporarily shut|temp(?:orary)? closed|closed for now|shut)\b/, 'temporarily_closed'],
    [/\b(currently open|trading|operational|open for business|that are open|still open)\b/, 'open'],
];

/** An explicitly named field, so "city Manila" beats the free-text fallback. */
const FIELD_WORDS = [
    [/\b(?:city|town)\b/, 'city'],
    [/\b(?:state|province|region)\b/, 'state'],
    [/\bcountry\b/, 'country'],
    [/\b(?:postcode|postal code|zip code|zip|postal)\b/, 'postal'],
    [/\b(?:named|called|store name|name)\b/, 'name'],
];

/**
 * A place or proper-noun phrase, read from the ORIGINAL casing.
 *
 * Capitalisation is the only reliable signal that "Manila" is a place and
 * "stores" is not, so this runs before the text is lower-cased. A quoted string
 * always wins, because quoting is the merchant being explicit.
 */
function readProperNoun(clause) {
    const quoted = /["“”'‘’]([^"“”'‘’]{2,60})["“”'‘’]/.exec(clause);
    if (quoted) return quoted[1].trim();

    const after = /\b(?:in|at|near|around|from|located in|based in|inside)\s+((?:[A-Z][\w'’-]*)(?:\s+(?:de|del|of|the|la|los|las|san|santa|new|north|south|east|west|[A-Z][\w'’-]*))*)/
        .exec(clause);
    if (after) return after[1].trim();

    // "city Manila", "state = Metro Manila", "postcode: 1300".
    const labelled = /\b(?:city|town|state|province|region|country|postcode|postal code|zip code|zip|named|called)\b\s*(?:=|:|is|of)?\s*([A-Z0-9][\w'’-]*(?:\s+[A-Z0-9][\w'’-]*)*)/
        .exec(clause);
    if (labelled) return labelled[1].trim();

    return '';
}

/* --------------------------------------------------------------------- *
 * Interpretation
 * ------------------------------------------------------------------ */

/** Split on the separators that divide one condition from the next. */
function splitClauses(request) {
    return request
        .split(/[,;.\n]|\band\b|\balso\b|\bplus\b/i)
        .map((clause) => clause.trim())
        .filter((clause) => clause.length > 1);
}

/**
 * Interpret a request into the page's existing filter vocabulary.
 *
 * @param {string} request What the merchant typed.
 * @param {object} context
 * @param {string[]} context.allowedFilters Every filter defined across the
 *   account's locators — the only tag values that can be produced.
 * @param {Array<{_id: string, name: string}>} context.locators For "in the
 *   Downtown locator", which reuses the page's existing locator filter.
 * @param {{ signal?: AbortSignal, onProgress?: Function }} options
 * @returns {Promise<{ filters: Array, search: string, locatorIds: string[], unmatched: string[] }>}
 */
export async function interpretLocationRequest(request, { allowedFilters = [], locators = [] } = {}, options = {}) {
    const clauses = splitClauses(request);
    const filters = [];
    const locatorIds = [];
    const unmatched = [];
    let search = '';

    // Tag candidates are collected first so every one of them can be embedded
    // in a single pass at the end, rather than a model call per clause.
    const tagCandidates = [];

    const push = (field, operator, value) => {
        // One condition per field: a later clause about the same field replaces
        // the earlier one, which is what "unpublished, no wait, published"
        // should do. `filters` is the exception — several tags can be required.
        if (field !== 'filters') {
            const existing = filters.findIndex((entry) => entry.field === field);
            if (existing !== -1) filters.splice(existing, 1);
        }
        filters.push({ field, operator, value });
    };

    for (const original of clauses) {
        const clause = original.toLowerCase();
        const negated = NEGATION.test(clause);
        let handled = false;

        // 1. published
        if (PUBLISHED_FALSE.test(clause)) {
            push('published', 'equals', false);
            handled = true;
        } else if (PUBLISHED_TRUE.test(clause)) {
            push('published', 'equals', !negated);
            handled = true;
        }

        // 2. plan status. Checked before `active` so "inactive" isn't read as
        //    a negated "active" and then flipped twice.
        if (STATUS_INACTIVE.test(clause)) {
            push('status', 'equals', 'inactive');
            handled = true;
        } else if (STATUS_ACTIVE.test(clause)) {
            push('status', 'equals', negated ? 'inactive' : 'active');
            handled = true;
        }

        // 3. trading state
        for (const [pattern, value] of LOC_STATUS) {
            if (!pattern.test(clause)) continue;
            push('location_status', negated ? 'not_equals' : 'equals', value);
            handled = true;
            break;
        }

        // 4. a named locator
        for (const locator of locators) {
            const name = String(locator.name ?? '').trim();
            if (name.length < 2 || !clause.includes(name.toLowerCase())) continue;
            if (!locatorIds.includes(locator._id)) locatorIds.push(locator._id);
            handled = true;
            break;
        }

        // 5. an explicitly named field with a value beside it
        const noun = readProperNoun(original);
        if (noun) {
            const named = FIELD_WORDS.find(([pattern]) => pattern.test(clause));
            if (named) {
                const entry = filterFieldByName(named[1]);
                if (entry) {
                    // `name` reads as "contains" because a merchant asking for
                    // "stores called Galleria" means the branch whose name
                    // includes it, not one named exactly that.
                    const operator = negated ? 'not_equals' : (named[1] === 'name' ? 'contains' : 'equals');
                    push(named[1], operator, noun);
                    handled = true;
                }
            } else if (!handled || !search) {
                // An unlabelled place goes to the page's existing free-text
                // search, which already matches name/street/city/state/country/
                // postal — a far better answer than guessing which one it is.
                search = search ? `${search} ${noun}` : noun;
                handled = true;
            }
        }

        // 6. An amenity, resolved against the account's own filter list.
        //
        // Runs even when the clause already produced a condition: "stores with
        // wheelchair access in Quezon City" is one clause saying two things.
        // Whether the clause was already handled is carried on the candidate,
        // so a tag that doesn't match is only reported as ignored when it was
        // the *only* thing the clause seemed to be asking for.
        let queued = false;
        if (allowedFilters.length) {
            const stripped = clause
                // Drop the place already consumed above, then the scaffolding
                // words, leaving just the words that could name an amenity.
                .replace(noun ? noun.toLowerCase() : '', ' ')
                .replace(/\b(show|list|find|get|me|all|the|locations?|stores?|shops?|branches|with|that|have|has|having|which|are|is|a|an|in|at|of|city|town|state|province|country)\b/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (stripped.length >= 3) {
                const exact = allowedFilters.find((filter) => clause.includes(filter.toLowerCase()));
                if (exact) {
                    push('filters', negated ? 'not_equals' : 'contains', exact);
                    handled = true;
                } else {
                    tagCandidates.push({ clause: stripped, negated, wasHandled: handled });
                    queued = true;
                }
            }
        }

        if (!handled && !queued) unmatched.push(original);
    }

    // The one model call: rank the leftover phrases against the real filters.
    if (tagCandidates.length && allowedFilters.length) {
        try {
            const vectors = await embedTexts(
                [...allowedFilters, ...tagCandidates.map((candidate) => candidate.clause)],
                options
            );
            const filterVectors = vectors.slice(0, allowedFilters.length);
            const candidateVectors = vectors.slice(allowedFilters.length);

            tagCandidates.forEach((candidate, index) => {
                const [best] = rank(candidateVectors[index], allowedFilters.map((value, position) => ({
                    value,
                    vector: filterVectors[position],
                })), { threshold: TAG_THRESHOLD, limit: 1 });

                if (best) push('filters', candidate.negated ? 'not_equals' : 'contains', best.value);
                // Only worth reporting when the clause produced nothing else:
                // "unpublished stores in Manila" is fully handled, and naming
                // its leftover words as ignored would just be noise.
                else if (!candidate.wasHandled) unmatched.push(candidate.clause);
            });
        } catch (error) {
            if (error?.name === 'AbortError') throw error;
            // Without the model the rules still stand; the phrases it would
            // have matched are reported rather than silently dropped.
            for (const candidate of tagCandidates) {
                if (!candidate.wasHandled) unmatched.push(candidate.clause);
            }
        }
    } else {
        for (const candidate of tagCandidates) {
            if (!candidate.wasHandled) unmatched.push(candidate.clause);
        }
    }

    // Final gate before anything is handed to the URL.
    const validated = locationFilterListSchema.safeParse(filters);

    return {
        filters: validated.success ? validated.data : [],
        search: search.trim(),
        locatorIds,
        unmatched,
    };
}
