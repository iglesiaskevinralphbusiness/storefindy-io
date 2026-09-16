// Reads a written address into the address values the merchant actually has.
//
// THE MERCHANT'S OWN DATA IS THE DICTIONARY.
// Every place this module can produce is a string that already exists in one of
// their locations' `city`, `state`, `country` or `postal` columns — fetched by
// getLocationPlaces() and handed in as `places`. That is what makes forgiving
// matching safe: "baymbang" can only ever resolve to a city they really have,
// so a generous spelling threshold can't invent a place or widen a query to
// something the merchant never asked about.
//
// It also makes the matching *possible*. "California, United States" used to
// find nothing because the phrase was pushed at the database whole, while the
// column holds `state: "California"` and `country: "us"`. Splitting a written
// address into its parts needs to know which parts exist, and only the account's
// data knows that.
//
// Three tiers, most trustworthy first:
//
//   exact   the words are one of their values, ignoring case, accents and
//           punctuation — "pangasinan" is `Pangasinan`.
//   alias   the words are another name for one of their values — "United
//           States", "USA" and "us" are all `us`; "CA" is `California`. Built
//           from the ISO country list the app already ships and a US state
//           table, in both directions, because a merchant may store either form.
//   fuzzy   the words are one of their values misspelled — "baymbang" is
//           `Bayambang`, at an edit distance the value's own length decides.
//
// A fourth tier, semantic ranking by the embedding model, lives in
// location-filter-intent.js: it needs the worker, and this module is kept
// synchronous and testable without one.
import { COUNTRIES } from '@/utils/constant/countries';

/** The address columns a place can land in, most specific first. */
export const PLACE_FIELDS = ['postal', 'city', 'state', 'country'];

/** How trustworthy a match is, for choosing between two that collide. */
const VIA_RANK = { exact: 0, alias: 1, fuzzy: 2 };

/* --------------------------------------------------------------------- *
 * Normalising
 * ------------------------------------------------------------------ */

/**
 * The form everything is compared in: lower case, no accents, no punctuation.
 *
 * This is where the original bug died. "california" and "California" produce
 * the same key, and so do "Cebu City", "cebu  city" and "CEBU, CITY".
 */
export function normalizePlace(text) {
    return String(text ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/* --------------------------------------------------------------------- *
 * Alternate names
 * ------------------------------------------------------------------ */

// Informal names the ISO list doesn't carry. Only the ones people actually type
// into a search box; this is not meant to be a gazetteer.
const EXTRA_COUNTRY_NAMES = {
    us: ['usa', 'u s a', 'u s', 'united states of america', 'america', 'the states'],
    gb: ['uk', 'u k', 'great britain', 'britain', 'england', 'scotland', 'wales', 'northern ireland'],
    ae: ['uae', 'u a e', 'emirates'],
    kr: ['korea', 'republic of korea', 'south korea'],
    kp: ['north korea', 'dprk'],
    ru: ['russian federation'],
    cz: ['czechia', 'czech republic'],
    nl: ['holland', 'the netherlands'],
    ch: ['swiss'],
    ie: ['republic of ireland', 'eire'],
    ph: ['pilipinas', 'the philippines'],
    vn: ['viet nam'],
    la: ['laos'],
    sy: ['syrian arab republic'],
    tz: ['tanzania'],
    bo: ['bolivia'],
    ve: ['venezuela'],
    ir: ['iran'],
    mk: ['macedonia'],
    tw: ['taiwan'],
    hk: ['hong kong'],
    mo: ['macau', 'macao'],
    cd: ['drc', 'congo kinshasa'],
    cg: ['congo brazzaville'],
    ci: ['ivory coast'],
    cv: ['cape verde'],
    tl: ['east timor'],
    sz: ['swaziland'],
    mm: ['burma'],
};

const US_STATES = [
    ['al', 'Alabama'], ['ak', 'Alaska'], ['az', 'Arizona'], ['ar', 'Arkansas'],
    ['ca', 'California'], ['co', 'Colorado'], ['ct', 'Connecticut'], ['de', 'Delaware'],
    ['dc', 'District of Columbia'], ['fl', 'Florida'], ['ga', 'Georgia'], ['hi', 'Hawaii'],
    ['id', 'Idaho'], ['il', 'Illinois'], ['in', 'Indiana'], ['ia', 'Iowa'],
    ['ks', 'Kansas'], ['ky', 'Kentucky'], ['la', 'Louisiana'], ['me', 'Maine'],
    ['md', 'Maryland'], ['ma', 'Massachusetts'], ['mi', 'Michigan'], ['mn', 'Minnesota'],
    ['ms', 'Mississippi'], ['mo', 'Missouri'], ['mt', 'Montana'], ['ne', 'Nebraska'],
    ['nv', 'Nevada'], ['nh', 'New Hampshire'], ['nj', 'New Jersey'], ['nm', 'New Mexico'],
    ['ny', 'New York'], ['nc', 'North Carolina'], ['nd', 'North Dakota'], ['oh', 'Ohio'],
    ['ok', 'Oklahoma'], ['or', 'Oregon'], ['pa', 'Pennsylvania'], ['ri', 'Rhode Island'],
    ['sc', 'South Carolina'], ['sd', 'South Dakota'], ['tn', 'Tennessee'], ['tx', 'Texas'],
    ['ut', 'Utah'], ['vt', 'Vermont'], ['va', 'Virginia'], ['wa', 'Washington'],
    ['wv', 'West Virginia'], ['wi', 'Wisconsin'], ['wy', 'Wyoming'],
    ['pr', 'Puerto Rico'], ['gu', 'Guam'], ['vi', 'US Virgin Islands'],
];

/**
 * Build `key -> every other name for the same thing`, in both directions, so it
 * doesn't matter whether the merchant stored "us" and the search says "United
 * States" or the other way round.
 */
function buildAliasGroups(pairs, extras = {}) {
    const groups = new Map();

    for (const [code, label] of pairs) {
        const names = new Set([code, normalizePlace(label), ...(extras[code] || []).map(normalizePlace)]);
        names.delete('');
        for (const name of names) {
            // First writer wins: "georgia" is the US state before it is the
            // country, and "la" is Louisiana before it is Laos. Both are
            // ambiguous in reality, and the exact tier settles it anyway —
            // an alias is only consulted when the merchant's own values
            // didn't already answer.
            if (!groups.has(name)) groups.set(name, names);
        }
    }

    return groups;
}

const COUNTRY_ALIASES = buildAliasGroups(
    COUNTRIES.map((country) => [country.code, country.label]),
    EXTRA_COUNTRY_NAMES,
);
const STATE_ALIASES = buildAliasGroups(US_STATES);

function aliasesFor(field, key) {
    const groups = field === 'country' ? COUNTRY_ALIASES : field === 'state' ? STATE_ALIASES : null;
    if (!groups) return [];
    const names = groups.get(key);
    return names ? [...names].filter((name) => name !== key) : [];
}

/* --------------------------------------------------------------------- *
 * Spelling distance
 * ------------------------------------------------------------------ */

/** Only worth fuzzy-matching a word long enough for a typo to be a typo. */
const FUZZY_MIN_LENGTH = 4;
/** 1 - distance/length. 0.7 lets "baymbang" reach "Bayambang" (0.89). */
const FUZZY_MIN_SIMILARITY = 0.7;

/**
 * Levenshtein distance, abandoned as soon as it passes `max`.
 *
 * Two rows rather than a full matrix: this runs over every value the merchant
 * has, for every unresolved word, on a keystroke-free code path but still in the
 * browser's main thread.
 */
function editDistance(a, b, max) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > max) return max + 1;

    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    let current = new Array(b.length + 1);

    for (let i = 1; i <= a.length; i += 1) {
        current[0] = i;
        let best = current[0];

        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
            if (current[j] < best) best = current[j];
        }

        if (best > max) return max + 1;
        [previous, current] = [current, previous];
    }

    return previous[b.length];
}

function similarity(a, b) {
    const longest = Math.max(a.length, b.length);
    if (!longest) return 0;
    const max = Math.ceil(longest * (1 - FUZZY_MIN_SIMILARITY));
    const distance = editDistance(a, b, max);
    return distance > max ? 0 : 1 - distance / longest;
}

/* --------------------------------------------------------------------- *
 * The index
 * ------------------------------------------------------------------ */

/**
 * Turn the merchant's distinct address values into something searchable.
 *
 * @param {{city?: string[], state?: string[], country?: string[], postal?: string[]}} places
 * @returns {{entries: Map, values: Array, maxWords: number, size: number}}
 */
export function buildPlaceIndex(places = {}) {
    const entries = new Map();
    const values = [];
    let maxWords = 1;

    const add = (key, candidate) => {
        if (!key) return;
        maxWords = Math.max(maxWords, key.split(' ').length);
        const existing = entries.get(key);
        if (!existing) {
            entries.set(key, [candidate]);
            return;
        }
        // One key can legitimately mean two things — a city and a state with the
        // same name. Both are kept as alternatives and resolveAddress() picks.
        if (!existing.some((entry) => entry.field === candidate.field && entry.value === candidate.value)) {
            existing.push(candidate);
            existing.sort(compareCandidates);
        }
    };

    for (const field of PLACE_FIELDS) {
        const list = Array.isArray(places[field]) ? places[field] : [];
        for (const raw of list) {
            const value = String(raw ?? '').trim();
            const key = normalizePlace(value);
            if (!key) continue;

            add(key, { field, value, via: 'exact' });
            values.push({ field, value, key });

            for (const alias of aliasesFor(field, key)) {
                add(alias, { field, value, via: 'alias' });
            }
        }
    }

    return { entries, values, maxWords, size: values.length };
}

/** Exact beats alias beats fuzzy; then the more specific column wins. */
function compareCandidates(a, b) {
    const byVia = VIA_RANK[a.via] - VIA_RANK[b.via];
    if (byVia !== 0) return byVia;
    return PLACE_FIELDS.indexOf(a.field) - PLACE_FIELDS.indexOf(b.field);
}

/* --------------------------------------------------------------------- *
 * Reading an address
 * ------------------------------------------------------------------ */

/** Longest run of words tried as one place name. */
const MAX_MATCH_WORDS = 6;

/**
 * Words that mark which column is meant rather than naming a place. They are
 * dropped from what gets reported back as unresolved, so "in california state"
 * doesn't tell the merchant that "state" was ignored — of course it was.
 */
const FILLER_WORDS = new Set([
    'city', 'town', 'state', 'province', 'region', 'country', 'postcode',
    'postal', 'zip', 'code', 'area', 'of', 'the', 'in', 'at', 'near',
]);

function stripFiller(text) {
    return text.split(' ').filter((word) => word && !FILLER_WORDS.has(word)).join(' ');
}

/**
 * A written address reduced to the words that name somewhere.
 *
 * For the fallback substring match, when nothing in the account's data matched:
 * "zip code 90210" is searched for as "90210", because the columns hold the
 * code and not the word in front of it.
 */
export function cleanPlacePhrase(phrase) {
    return stripFiller(normalizePlace(phrase)).trim();
}

/**
 * Read a written address into the merchant's own values.
 *
 * Words are consumed longest-run-first, so "New York" is one city rather than
 * two unknown words, and whatever is left over is tried again as a misspelling.
 * Parts that resolve to nothing are RETURNED, not applied: "telbang bayambang
 * pangasinan" should still answer with Bayambang, Pangasinan rather than
 * ANDing in a barangay the account doesn't record and returning an empty page.
 *
 * @param {string} phrase The address as the merchant wrote it.
 * @param {object} index From buildPlaceIndex().
 * @returns {{matches: Array<{field, value, via}>, leftover: string[], consumed: string[]}}
 *   `consumed` is the normalised word runs that became a match — what the
 *   caller needs to tell an address word from a word to search the text for.
 */
export function resolveAddress(phrase, index) {
    if (!index || !index.size) return { matches: [], leftover: [], consumed: [] };

    const groups = [];
    const leftover = [];
    const consumed = [];

    for (const segment of String(phrase ?? '').split(/[,/|]+/)) {
        const tokens = normalizePlace(segment).split(' ').filter(Boolean);
        let unknown = [];
        let i = 0;

        const flushUnknown = () => {
            if (unknown.length) leftover.push(unknown.join(' '));
            unknown = [];
        };

        while (i < tokens.length) {
            const longest = Math.min(index.maxWords, MAX_MATCH_WORDS, tokens.length - i);
            let hit = null;

            for (let size = longest; size >= 1; size -= 1) {
                const found = index.entries.get(tokens.slice(i, i + size).join(' '));
                if (found) {
                    hit = { found, size };
                    break;
                }
            }

            if (hit) {
                flushUnknown();
                groups.push(hit.found);
                consumed.push(tokens.slice(i, i + hit.size).join(' '));
                i += hit.size;
            } else {
                unknown.push(tokens[i]);
                i += 1;
            }
        }

        flushUnknown();
    }

    // Second pass: what is left is either a misspelling of one of their values
    // or genuinely not something this account records. The same longest-run
    // sweep as above, because a typo spans words as readily as a name does —
    // "san deigo" is one misspelt city, not two unknown words.
    const unresolved = [];

    for (const run of leftover) {
        const tokens = run.split(' ').filter(Boolean);
        const unknown = [];
        let i = 0;

        while (i < tokens.length) {
            const longest = Math.min(index.maxWords, MAX_MATCH_WORDS, tokens.length - i);
            let hit = null;

            for (let size = longest; size >= 1; size -= 1) {
                const found = bestFuzzy(tokens.slice(i, i + size).join(' '), index);
                if (found) {
                    hit = { found, size };
                    break;
                }
            }

            if (hit) {
                groups.push([hit.found]);
                consumed.push(tokens.slice(i, i + hit.size).join(' '));
                i += hit.size;
            } else {
                unknown.push(tokens[i]);
                i += 1;
            }
        }

        const remaining = stripFiller(unknown.join(' ')).trim();
        if (remaining) unresolved.push(remaining);
    }

    return { matches: assign(groups), leftover: unresolved, consumed };
}

function bestFuzzy(text, index) {
    const key = normalizePlace(text);
    // Digits are identifiers, not words: "2423" is not a misspelling of "2413",
    // and treating it as one would quietly return somebody else's postcode.
    if (key.length < FUZZY_MIN_LENGTH || /^\d+$/.test(key)) return null;

    let best = null;
    for (const entry of index.values) {
        if (entry.key.length < FUZZY_MIN_LENGTH || /^\d+$/.test(entry.key)) continue;
        const score = similarity(key, entry.key);
        if (score < FUZZY_MIN_SIMILARITY) continue;
        if (!best || score > best.score || (score === best.score && compareCandidates(entry, best) < 0)) {
            best = { field: entry.field, value: entry.value, via: 'fuzzy', score };
        }
    }

    return best ? { field: best.field, value: best.value, via: 'fuzzy' } : null;
}

/**
 * Give each column at most one value.
 *
 * A group is the set of columns one run of words could have meant. Taking them
 * in the order they were written lets "Bayambang Pangasinan" fill city then
 * state even when both names exist in both columns.
 */
function assign(groups) {
    const taken = new Map();

    for (const group of groups) {
        const choice = group.find((candidate) => !taken.has(candidate.field));
        if (!choice) continue;
        taken.set(choice.field, choice);
    }

    return PLACE_FIELDS
        .filter((field) => taken.has(field))
        .map((field) => taken.get(field));
}
