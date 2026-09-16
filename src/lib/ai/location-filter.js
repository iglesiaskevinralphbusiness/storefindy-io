// Natural-language filtering for the dashboard's Locations page.
//
// THE MODEL NEVER WRITES A QUERY.
// It produces one thing: a list of `{ field, operator, value }` triples drawn
// from the closed catalogue below. That list is validated with Zod, travels
// through the URL like every other filter on this page, and is turned into a
// MongoDB query by src/lib/locations-query.js — server-side, from the whitelist,
// with the values escaped there as they already are for `search`. There is no
// path by which a model output becomes a Mongo operator: `field` is an enum of
// the names below, `operator` an enum of three, and `value` a string, number or
// boolean that is only ever used as a *value*, never as a key.
//
// The filter list is the WHOLE query. It does not borrow the manual form's
// `search` or `locators` parameters — a described search and a typed search are
// two separate ways to filter this page, and running one clears the other. A
// place the merchant didn't label ("in california") becomes the `place` filter
// below, which matches every address column at once instead of being guessed
// into a city-versus-state decision.
import { z } from 'zod';
import { LOCATION_STATUSES } from '@/lib/csv-import-fields';
import { COUNTRIES } from '@/utils/constant/countries';
import { scheduleValueSchema, hasScheduleCondition, describeSchedule } from './schedule-filter';

/* --------------------------------------------------------------------- *
 * The catalogue
 * ------------------------------------------------------------------ */

/**
 * Every field the Locations page can be filtered by, and how.
 *
 *   field     the name that appears in a filter triple — and, in
 *             locations-query.js, the only names that map to a query term.
 *   column    the location document path it reads. `status` has none: it is
 *             derived from the plan limit, not stored, and is handled apart.
 *   kind      how a value is read and validated.
 */
export const FILTER_FIELDS = [
    {
        field: 'published',
        column: 'published',
        kind: 'boolean',
        label: 'Published',
        phrases: ['published locations', 'unpublished stores', 'draft locations', 'hidden locations', 'live locations'],
    },
    {
        field: 'status',
        column: null,
        kind: 'enum',
        options: ['active', 'inactive'],
        label: 'Plan status',
        phrases: ['active locations', 'inactive locations', 'locations over my plan limit', 'disabled by the plan limit'],
    },
    {
        field: 'location_status',
        column: 'location_status',
        kind: 'enum',
        options: LOCATION_STATUSES,
        label: 'Store status',
        phrases: ['stores that are open', 'temporarily closed stores', 'coming soon locations', 'shops not trading yet'],
    },
    {
        field: 'filters',
        column: 'filters',
        kind: 'tag',
        label: 'Filter / category',
        phrases: ['locations with a particular amenity', 'stores tagged with a category', 'locations that have free wifi', 'shops with parking'],
    },
    {
        field: 'city',
        column: 'city',
        kind: 'text',
        label: 'City',
        phrases: ['in a particular city', 'city name', 'town'],
    },
    {
        field: 'state',
        column: 'state',
        kind: 'text',
        label: 'State / Province',
        phrases: ['in a particular state', 'province', 'region'],
    },
    {
        field: 'country',
        column: 'country',
        kind: 'text',
        label: 'Country',
        phrases: ['in a particular country', 'country'],
    },
    {
        field: 'postal',
        column: 'postal',
        kind: 'text',
        label: 'Postal / ZIP code',
        phrases: ['postcode', 'zip code', 'postal code'],
    },
    {
        field: 'name',
        column: 'name',
        kind: 'text',
        label: 'Store name',
        phrases: ['store name contains', 'branch called', 'named'],
    },
    {
        // Words that didn't resolve to anything more specific, matched across
        // everything a location carries text in.
        //
        // `custom_notes` and `description` are in here deliberately, and are the
        // reason this is not just an address fallback: merchants use notes for
        // the things no column covers ("inside the food court", "drive-through
        // only"), and the storefront locator has always searched them. A
        // merchant looking for the same thing on their own Locations page
        // should not find less than a shopper does.
        //
        // The columns are constants here; see buildFilterTerms() in
        // src/lib/locations-query.js.
        field: 'text',
        column: null,
        columns: ['name', 'street', 'city', 'state', 'country', 'postal', 'custom_notes', 'description', 'filters'],
        kind: 'text',
        label: 'Any text',
        phrases: ['anything in the address, the name or the notes'],
    },
    {
        // Opening hours. Evaluated in JavaScript rather than as a query term —
        // see src/lib/ai/schedule-filter.js for why, and for the matcher the
        // storefront locator shares with it.
        field: 'hours',
        column: null,
        kind: 'schedule',
        label: 'Opening hours',
        phrases: ['open now', 'closed now', 'open 24 hours', 'open on saturday and sunday', 'closed on monday', 'open at 1pm today'],
    },
    {
        // The account's own locator, by id. The AI filter owns this rather than
        // borrowing the manual form's `locators` parameter, so a described
        // search is one self-contained filter list.
        field: 'locator',
        column: 'locator_id',
        kind: 'id',
        label: 'Locator',
        phrases: ['in a named locator', 'belonging to a locator'],
    },
];

const FIELD_BY_NAME = new Map(FILTER_FIELDS.map((entry) => [entry.field, entry]));

/** The whole point of the exercise: nothing outside these lists can be built. */
export const FILTER_FIELD_NAMES = FILTER_FIELDS.map((entry) => entry.field);
export const FILTER_OPERATORS = ['equals', 'not_equals', 'contains'];

/**
 * The validated shape. A filter list that fails this never reaches the query
 * builder, and the query builder re-parses it rather than trusting the caller.
 */
export const locationFilterSchema = z.object({
    field: z.enum(FILTER_FIELD_NAMES),
    operator: z.enum(FILTER_OPERATORS),
    // The one structured value: a schedule condition, which is a handful of
    // bounded flags and integers (scheduleValueSchema). It is the exception that
    // proves the rule about keys — it never reaches Mongo at all, because
    // opening hours are arithmetic over sub-documents rather than a query term.
    value: z.union([z.string().max(200), z.boolean(), z.number(), scheduleValueSchema]),
});

export const locationFilterListSchema = z.array(locationFilterSchema).max(10);

/* --------------------------------------------------------------------- *
 * URL codec
 * ------------------------------------------------------------------ */

/** The query-string parameter the filter list travels in. */
export const FILTER_PARAM = 'ai';

/** Serialise a validated filter list for the URL. */
export function encodeLocationFilters(filters) {
    const parsed = locationFilterListSchema.safeParse(filters);
    if (!parsed.success || parsed.data.length === 0) return '';
    return JSON.stringify(parsed.data);
}

/**
 * Read a filter list back out of the URL.
 *
 * Returns `[]` for anything malformed rather than throwing: this value is
 * attacker-controlled (it is a query string), and a bad one should mean "no
 * filter", never an error page or a partially-applied query.
 */
export function decodeLocationFilters(raw) {
    if (!raw || typeof raw !== 'string') return [];
    if (raw.length > 2000) return [];

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return [];
    }

    const result = locationFilterListSchema.safeParse(parsed);
    if (!result.success) return [];

    // Second gate: the value has to suit the field it claims. A boolean `city`
    // or an out-of-list `location_status` is dropped, not coerced.
    return result.data.filter((filter) => isValueValid(FIELD_BY_NAME.get(filter.field), filter));
}

function isValueValid(entry, filter) {
    if (!entry) return false;
    switch (entry.kind) {
        case 'boolean':
            return typeof filter.value === 'boolean';
        case 'enum':
            return typeof filter.value === 'string' && entry.options.includes(filter.value);
        case 'tag':
        case 'text':
            return typeof filter.value === 'string' && filter.value.trim().length > 0;
        case 'id':
            // A 24-hex ObjectId and nothing else: this one reaches the query as
            // an `$in` member, so anything else is dropped here rather than
            // cast later.
            return typeof filter.value === 'string' && /^[a-f\d]{24}$/i.test(filter.value);
        case 'schedule':
            // Already shaped by scheduleValueSchema above; this only drops a
            // well-formed object that happens to say nothing.
            return hasScheduleCondition(filter.value);
        default:
            return false;
    }
}

/**
 * Human sentence for one filter, for the chips above the results table.
 *
 * @param {object} filter
 * @param {{ locators?: Array<{_id: string, name: string}> }} context Used to
 *   name a locator filter, whose stored value is an id the merchant never saw.
 */
export function describeFilter(filter, { locators = [] } = {}) {
    const entry = FIELD_BY_NAME.get(filter.field);
    if (!entry) return '';

    if (entry.kind === 'boolean') {
        return `${entry.label}: ${filter.value ? 'yes' : 'no'}`;
    }

    if (entry.kind === 'schedule') {
        return describeSchedule(filter.value);
    }

    if (entry.kind === 'id') {
        const match = locators.find((locator) => String(locator._id) === String(filter.value));
        return `${entry.label} ${filter.operator === 'not_equals' ? 'is not' : 'is'} ${match?.name || 'unknown'}`;
    }
    const verb = filter.operator === 'not_equals' ? 'is not' : filter.operator === 'contains' ? 'contains' : 'is';
    const value = typeof filter.value === 'string' ? filter.value.replace(/_/g, ' ') : String(filter.value);
    // `country` is stored as an ISO code. The chip names the country, because
    // "Country is us" reads like a typo and "Country is United States" doesn't.
    return `${entry.label} ${verb} ${filter.field === 'country' ? countryLabel(value) : value}`;
}

function countryLabel(value) {
    const code = String(value).trim().toLowerCase();
    return COUNTRIES.find((country) => country.code === code)?.label || value;
}

export const filterFieldByName = (field) => FIELD_BY_NAME.get(field);
