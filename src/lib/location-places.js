// The distinct address values one account actually has.
//
// This is the dictionary src/lib/ai/place-resolver.js matches a written address
// against. Keeping it to the merchant's own values is what lets the Locations
// page be forgiving about spelling and format without ever inventing a place:
// the worst a bad match can do is name a city they really have.
import { dbConnect } from '@/config/mongo.config';
import { LocationModel } from '@/mongo';

/** Address columns offered to the resolver. `street` is deliberately absent:
 *  it is a house number and a road, which is not a place anyone filters by. */
const PLACE_COLUMNS = ['city', 'state', 'country', 'postal'];

/**
 * How many distinct values per column travel to the browser. An account past
 * this is unusual; when it happens the extra values simply aren't resolvable
 * and the phrase falls back to the page's substring match, which still works.
 */
export const PLACE_VOCABULARY_LIMIT = 500;

function tidy(values) {
    const seen = new Map();

    for (const raw of values) {
        const value = String(raw ?? '').trim();
        if (!value || value.length > 100) continue;
        // Case-insensitive dedupe: "Manila" and "manila" are one value, and the
        // resolver compares case-insensitively anyway.
        const key = value.toLowerCase();
        if (!seen.has(key)) seen.set(key, value);
        if (seen.size >= PLACE_VOCABULARY_LIMIT) break;
    }

    return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * @param {string} user_id Owner of the locations, from the session — never from
 *   the caller's input.
 * @returns {Promise<{city: string[], state: string[], country: string[], postal: string[]}>}
 */
export async function getLocationPlaces(user_id) {
    await dbConnect();

    const lists = await Promise.all(
        PLACE_COLUMNS.map((column) => LocationModel.distinct(column, { user_id })),
    );

    return Object.fromEntries(
        PLACE_COLUMNS.map((column, index) => [column, tidy(lists[index])]),
    );
}
