// Reads a merchant's sentence on the Locations page into the filter triples
// defined by ./location-filter.js.
//
// ONE VOCABULARY, TWO PAGES.
// The sentence is parsed by parseLocatorPrompt() — the same function that reads
// a shopper's sentence on the storefront locator. That is deliberate and it is
// the whole design: "open on saturday and sunday", "closed now", "temporarily
// closed", "24 hours", "named Galleria" and every translation of them are
// understood here because they are understood there, not because the list was
// copied across. A phrase added to the locator's phrase book works on this page
// the day it lands.
//
// This module only adds what the locator has no concept of, because the
// storefront only ever shows one published, in-plan locator:
//
//   published / unpublished   a column the shopper never sees
//   active / inactive         the plan's location allowance, derived at read time
//   a named locator           the storefront is already inside exactly one
//
// Those are consumed off the front of the sentence, and what remains is handed
// over. Going the other way, the conditions the locator answers with a map — a
// radius, "near me", zoom and pan — have nothing to act on here and are reported
// as ignored rather than silently dropped.
//
// THE MODEL NEVER WRITES A QUERY, and on this page it is not asked anything at
// all any more. Places resolve against the account's own address values
// (./place-resolver.js) and amenities against its own filter labels, both by
// rule. See ./location-filter.js for what the triples are allowed to say.
import { parseLocatorPrompt, normalizePromptText } from './locator-prompt';
import { buildPlaceIndex, resolveAddress } from './place-resolver';
import { scheduleFromIntent } from './schedule-filter';
import { locationFilterListSchema } from './location-filter';

/* --------------------------------------------------------------------- *
 * The page's own vocabulary
 * ------------------------------------------------------------------ */

// Longest first, so "not published" is taken before "published".
const byLength = (list) => [...list].sort((a, b) => b.length - a.length);

/** `published` — the column. Nothing to do with opening hours. */
const PUBLISHED_FALSE = byLength([
    'not published', 'unpublished', 'un published', 'draft', 'drafts', 'hidden',
    'private', 'offline', 'not live', 'not visible', 'not public',
]);
const PUBLISHED_TRUE = byLength([
    'published', 'live', 'public', 'visible', 'online',
]);

/** `status` — inside or outside the plan's location allowance. */
const STATUS_INACTIVE = byLength([
    'inactive', 'in active', 'over my plan limit', 'over the plan limit',
    'over my limit', 'over the limit', 'beyond my limit', 'beyond the limit',
    'disabled by the plan', 'disabled by plan', 'past my plan limit',
]);
const STATUS_ACTIVE = byLength(['active']);

function escapeForRegex(input) {
    return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Take the first of `phrases` that appears, and blank it out.
 *
 * Word-bounded, or "active" would be found inside "inactive" and "live" inside
 * "delivery". Returns the shortened text so the next rule — and ultimately the
 * locator's parser — never sees a word that has already been answered.
 */
function consume(text, phrases) {
    for (const phrase of phrases) {
        const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeForRegex(phrase)}(?=[^\\p{L}\\p{N}]|$)`, 'iu');
        if (pattern.test(text)) return { text: text.replace(pattern, '$1 '), hit: true };
    }
    return { text, hit: false };
}

/** How many words a free-text search is allowed to require at once. */
const MAX_TEXT_TERMS = 6;

/**
 * "everywhere except Manila".
 *
 * Only ever consulted on what is LEFT once the locator's phrase book has had
 * the sentence: it consumes "not published" and "not open" whole, so a "not"
 * still standing beside a place really is about the place. The locator itself
 * has no use for this — a shopper does not ask a storefront for the branches
 * that are not near them — which is why it lives on this side.
 */
const NEGATION_WORDS = ['not', 'no', 'non', 'without', 'excluding', 'except', 'other than', 'apart from', 'aside from'];
const NEGATION = new RegExp(`\\b(?:${NEGATION_WORDS.join('|')})\\b`, 'i');

/* --------------------------------------------------------------------- *
 * Interpretation
 * ------------------------------------------------------------------ */

/**
 * Interpret a request into the page's existing filter vocabulary.
 *
 * @param {string} request What the merchant typed.
 * @param {object} context
 * @param {string[]} context.allowedFilters Every filter defined across the
 *   account's locators — the only amenity values that can be produced.
 * @param {Array<{_id: string, name: string}>} context.locators For "in the
 *   Downtown locator", which becomes a `locator` filter in the list.
 * @param {{city?: string[], state?: string[], country?: string[], postal?: string[]}} context.places
 *   Every distinct address value the account has, from getLocationPlaces().
 * @returns {{filters: Array, unmatched: string[]}} The filter list is the entire
 *   result: this reader never writes to the manual form's `search` or `locators`
 *   parameters, so the described search stands on its own.
 */
export function interpretLocationRequest(request, { allowedFilters = [], locators = [], places = null } = {}) {
    const filters = [];
    const unmatched = [];
    const placeIndex = buildPlaceIndex(places || {});

    const push = (field, operator, value) => {
        // One condition per field: a later clause about the same field replaces
        // the earlier one. `filters` and `locator` are the exceptions — several
        // amenities can be required at once, and naming two locators means
        // either.
        if (field !== 'filters' && field !== 'locator' && field !== 'text') {
            const existing = filters.findIndex((entry) => entry.field === field);
            if (existing !== -1) filters.splice(existing, 1);
        }
        filters.push({ field, operator, value });
    };

    let text = normalizePromptText(request);

    /* 1. published — checked false-first, since "not published" contains it. */
    let taken = consume(text, PUBLISHED_FALSE);
    if (taken.hit) {
        push('published', 'equals', false);
        text = taken.text;
    } else {
        taken = consume(text, PUBLISHED_TRUE);
        if (taken.hit) {
            push('published', 'equals', true);
            text = taken.text;
        }
    }

    /* 2. the plan's allowance — "inactive" before "active", same reason. */
    taken = consume(text, STATUS_INACTIVE);
    if (taken.hit) {
        push('status', 'equals', 'inactive');
        text = taken.text;
    } else {
        taken = consume(text, STATUS_ACTIVE);
        if (taken.hit) {
            push('status', 'equals', 'active');
            text = taken.text;
        }
    }

    /* 3. a named locator, by the name the merchant gave it. */
    for (const locator of locators) {
        const name = normalizePromptText(locator.name);
        if (name.length < 2 || !text.includes(name)) continue;
        const id = String(locator._id ?? '');
        if (!filters.some((entry) => entry.field === 'locator' && entry.value === id)) {
            push('locator', 'equals', id);
        }
        text = text.replace(name, ' ');
        // The word "locator" itself is scaffolding once the name is taken.
        text = consume(text, ['locator', 'locators']).text;
    }

    /* 4. everything else is the locator's to read. */
    const intent = parseLocatorPrompt(text, { filters: allowedFilters });

    /* 5. the merchant-set trading state. */
    if (intent.locationStatus) {
        push('location_status', 'equals', intent.locationStatus);
    }

    /* 6. opening hours — one condition, matched by the same function the
     *    storefront uses. See ./schedule-filter.js. */
    const schedule = scheduleFromIntent(intent);
    if (schedule) push('hours', 'equals', schedule);

    /* 7. amenities, already resolved against the account's own labels. */
    for (const filter of intent.filters) {
        push('filters', 'contains', filter);
    }

    /* 8. a store name the merchant spelled out. */
    if (intent.name) push('name', 'contains', intent.name);

    /* 9. whatever is left is an address, or words to look for in the text. */
    applyLeftover(intent, placeIndex, push, unmatched);

    /* 10. the conditions this page has no way to answer. A radius and "near me"
     *     need a map and a visitor's position; zoom and pan need a map at all.
     *     Named rather than dropped, so the merchant isn't left wondering why
     *     the result ignored half their sentence. */
    if (intent.nearMe) unmatched.push('near me');
    if (intent.radius) unmatched.push(`within ${intent.radius.value} ${intent.radius.unit}`);
    if (intent.map) unmatched.push(intent.map.action === 'pan' ? 'move the map' : intent.map.action.replace('_', ' '));

    const validated = locationFilterListSchema.safeParse(filters);

    return {
        filters: validated.success ? validated.data : [],
        unmatched,
    };
}

/**
 * The merchant's own words: an address, or something to look for in the text.
 *
 * Addresses resolve against the account's real values, so "california, united
 * states" becomes the state and the country it actually stores.
 *
 * What happens to the rest turns on whether any of it WAS an address. When the
 * sentence named a place this account has, the address is the question and the
 * words around it are noise — "telbang bayambang pangasinan" should answer with
 * Bayambang, Pangasinan, not AND in a barangay that is recorded nowhere and
 * return an empty page. When it named no place at all, those same words are the
 * question: "inside the food court" is the merchant looking through their own
 * notes, which is what the storefront locator has always done with them.
 */
function applyLeftover(intent, placeIndex, push, unmatched) {
    const leftover = String(intent.leftoverText || '').trim();
    if (!leftover && !intent.keywords.length) return;

    const negated = NEGATION.test(leftover);
    const operator = negated ? 'not_equals' : 'equals';

    // The raw leftover first (word order and articles matter to a place name),
    // then the cleaned keywords — the only form that works for the scripts with
    // no spaces, where the whole sentence is one token.
    let { matches, consumed } = resolveAddress(leftover, placeIndex);
    if (!matches.length && intent.keywords.length) {
        ({ matches, consumed } = resolveAddress(intent.keywords.join(' '), placeIndex));
    }

    for (const match of matches) push(match.field, operator, match.value);

    // Only the meaningful words — `keywords` has already had the scaffolding of
    // nine languages taken out of it, which is why "Show me all locations that
    // are open now" leaves nothing behind to search for.
    const spent = new Set(consumed.flatMap((run) => run.split(' ')));
    const rest = intent.keywords.filter((keyword) => !spent.has(keyword) && !NEGATION_WORDS.includes(keyword));

    if (!rest.length) return;

    if (matches.length) {
        for (const word of rest) unmatched.push(word);
        return;
    }

    // One term per word, so each has to appear somewhere on the location but
    // not all in the same column — and so "drive-through" is found by "drive"
    // and "through" without the hyphen having to match.
    for (const word of rest.slice(0, MAX_TEXT_TERMS)) {
        push('text', negated ? 'not_equals' : 'contains', word);
    }
}
