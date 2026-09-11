// Natural-language filtering for the dashboard's Locations page.
//
// THE MODEL NEVER WRITES A QUERY.
// It produces one thing: a list of `{ field, operator, value }` triples drawn
// from the closed catalogue below. That list is validated with Zod, travels
// through the URL like every other filter on this page, and is turned into a
// MongoDB query by src/lib/locations-query.js — server-side, from the whitelist,
// with the values escaped there as they already are for `search`. There is no
// path by which a model output becomes a Mongo operator: `field` is an enum of
// seven names, `operator` an enum of three, and `value` a string, number or
// boolean that is only ever used as a *value*, never as a key.
//
// Anything the catalogue can't express falls back to the page's existing
// free-text `search` parameter, which already matches name/street/city/state/
// country/postal. That keeps the structured surface small on purpose: a place
// name the merchant didn't label ("in Manila") is handed to the search that
// already exists rather than guessed into a city-versus-state decision.
import { z } from 'zod';
import { LOCATION_STATUSES } from '@/lib/csv-import-fields';

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
    value: z.union([z.string().max(200), z.boolean(), z.number()]),
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
        default:
            return false;
    }
}

/** Human sentence for one filter, for the chips above the results table. */
export function describeFilter(filter) {
    const entry = FIELD_BY_NAME.get(filter.field);
    if (!entry) return '';

    if (entry.kind === 'boolean') {
        return `${entry.label}: ${filter.value ? 'yes' : 'no'}`;
    }
    const verb = filter.operator === 'not_equals' ? 'is not' : filter.operator === 'contains' ? 'contains' : 'is';
    const value = typeof filter.value === 'string' ? filter.value.replace(/_/g, ' ') : String(filter.value);
    return `${entry.label} ${verb} ${value}`;
}

export const filterFieldByName = (field) => FIELD_BY_NAME.get(field);
