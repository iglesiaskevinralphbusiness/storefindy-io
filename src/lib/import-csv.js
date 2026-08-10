// Shared CSV bulk-import logic.
//
// Kept out of `src/actions/locations.js` (a "use server" module) so the dashboard
// action `importCSV()` and the REST route `POST /api/v1/locations/import-csv`
// build and write the exact same documents — same row validation, same defaults,
// same per-mode write strategy. Only the way the caller is identified differs.
//
// Everything here is plain data and database work: authentication and locator
// ownership stay with the callers, because they prove them differently (a
// NextAuth session in the dashboard, a Bearer API key over REST).
import { z } from 'zod';
import { dbConnect } from '@/config/mongo.config';
import { LocationModel } from '@/mongo';
import { sanitizeInput } from '@/utils/lib/input-sanitization';

// How the rows are applied to the locator's existing locations:
//   'append'  : insert every valid row (nothing is removed)
//   'replace' : delete all existing locations in the locator, then insert the valid rows
//   'update'  : upsert by name within the locator (existing names are updated, new names inserted)
export const IMPORT_MODES = ['append', 'replace', 'update'];

// CSV imports don't collect business hours, so every imported location starts
// with this default schedule (the model requires all seven days).
export const DEFAULT_IMPORT_HOURS = {
    Mon: { enabled: true, open: '08:00', close: '17:00' },
    Tue: { enabled: true, open: '08:00', close: '17:00' },
    Wed: { enabled: true, open: '08:00', close: '17:00' },
    Thu: { enabled: true, open: '08:00', close: '17:00' },
    Fri: { enabled: true, open: '08:00', close: '17:00' },
    Sat: { enabled: true, open: '08:00', close: '17:00' },
    Sun: { enabled: false, open: '08:00', close: '17:00' },
};

// Required coordinate: coerced to number and range-checked.
const coordinate = (min, max) =>
    z.preprocess(
        (v) => (v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v),
        z.coerce.number().min(min).max(max)
    );

const rowSchema = z.object({
    name: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    country: z.string().trim().min(1),
    latitude: coordinate(-90, 90),
    longitude: coordinate(-180, 180),
});

const text = (value) => String(value ?? '').trim();

/**
 * Re-validate every CSV row and turn the valid ones into full location documents.
 *
 * Coordinates are read from `lat`/`lng` (what the dashboard wizard maps CSV
 * columns onto) or from `latitude`/`longitude` (what the rest of the REST API
 * calls them), so a caller can send whichever pair it already has.
 *
 * @param {Array<object>} records     Mapped CSV rows.
 * @param {{user_id: string, locator_id: string}} owner
 * @returns {{docs: Array<object>, skipped: number}} `skipped` counts rows that
 *   failed validation — they are dropped, not fatal.
 */
export function buildImportDocs(records, { user_id, locator_id }) {
    const docs = [];
    let skipped = 0;

    for (const raw of records) {
        // Sanitize against NoSQL injection ($-prefixed keys) before validating.
        const clean = sanitizeInput({
            name: text(raw?.name),
            street: text(raw?.street),
            city: text(raw?.city),
            state: text(raw?.state),
            postal: text(raw?.postal),
            country: text(raw?.country),
            lat: text(raw?.lat ?? raw?.latitude),
            lng: text(raw?.lng ?? raw?.longitude),
            phone: text(raw?.phone),
            email: text(raw?.email),
            website: text(raw?.website),
            view_location_url: text(raw?.view_location_url),
        });

        const parsed = rowSchema.safeParse({
            name: clean.name,
            city: clean.city,
            state: clean.state,
            country: clean.country,
            latitude: clean.lat,
            longitude: clean.lng,
        });

        if (!parsed.success) {
            skipped++;
            continue;
        }

        docs.push({
            user_id,
            locator_id,
            name: clean.name,
            description: '',
            street: clean.street,
            city: clean.city,
            state: clean.state,
            postal: clean.postal,
            country: clean.country,
            latitude: parsed.data.latitude,
            longitude: parsed.data.longitude,
            location_status: 'open',
            hours: DEFAULT_IMPORT_HOURS,
            holidays: [],
            phone: clean.phone,
            email: clean.email,
            website: clean.website,
            view_location_url: clean.view_location_url,
            published: true,
            show_opening_hours: false,
            custom_notes: '',
        });
    }

    return { docs, skipped };
}

/**
 * Write the built documents into the locator according to `mode`.
 *
 * Throws on a database failure — callers wrap it so the failure surfaces in
 * their own error shape.
 *
 * @returns {Promise<{imported: number, updated: number}>}
 */
export async function writeImportDocs({ user_id, locator_id, mode, docs }) {
    await dbConnect();

    let imported = 0;
    let updated = 0;

    if (mode === 'replace') {
        // Wipe the locator's existing locations, then insert the new set.
        await LocationModel.deleteMany({ user_id, locator_id });
        await LocationModel.insertMany(docs);
        imported = docs.length;
    } else if (mode === 'update') {
        // Upsert by name within this locator: matching names are updated, new names inserted.
        for (const doc of docs) {
            const res = await LocationModel.updateOne(
                { user_id, locator_id, name: doc.name },
                { $set: doc },
                { upsert: true }
            );
            if (res.upsertedCount > 0) imported++;
            else updated++;
        }
    } else {
        // append
        await LocationModel.insertMany(docs);
        imported = docs.length;
    }

    return { imported, updated };
}
