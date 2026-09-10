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
import { DEFAULT_IMPORT_HOURS, parseOptionalLocationFields } from '@/lib/csv-import-fields';

// How the rows are applied to the locator's existing locations:
//   'append'  : insert every valid row (nothing is removed)
//   'replace' : delete all existing locations in the locator, then insert the valid rows
//   'update'  : upsert by name within the locator (existing names are updated, new names inserted)
export const IMPORT_MODES = ['append', 'replace', 'update'];

// Re-exported so the existing import path keeps working; the schedule itself now
// lives with the other CSV field rules in src/lib/csv-import-fields.js.
export { DEFAULT_IMPORT_HOURS };

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

// The optional columns that are stored exactly as typed — no format to get
// wrong, so nothing to reject. Everything else optional goes through
// parseOptionalLocationFields().
const PASSTHROUGH_OPTIONAL = ['postal', 'phone', 'email', 'website'];

// Defaults for every optional field the row didn't supply (or supplied badly).
// These are the values the model itself would fall back to, spelled out here so
// a document is always complete — `update` mode writes with `$set`, which would
// otherwise leave a stale value from a previous import in place.
//
// Built fresh per row rather than shared: the arrays and the hours object would
// otherwise be the same instances in every document of the batch.
const optionalDefaults = () => ({
    location_status: 'open',
    filters: [],
    hours: { ...DEFAULT_IMPORT_HOURS },
    holidays: [],
    view_location_url: '',
    social_media_links: [],
    published: true,
    show_opening_hours: false,
    custom_notes: '',
});

/**
 * Re-validate every CSV row and turn the valid ones into full location documents.
 *
 * Coordinates are read from `lat`/`lng` (what the dashboard wizard maps CSV
 * columns onto) or from `latitude`/`longitude` (what the rest of the REST API
 * calls them), so a caller can send whichever pair it already has.
 *
 * Required fields are all-or-nothing: a row missing one, or carrying a
 * non-numeric coordinate, is skipped. Optional fields are not — a value that
 * can't be parsed into the type `locationSchema` declares is replaced by that
 * field's default and reported in `issues`, so one mistyped cell never costs the
 * user the whole row. See src/lib/csv-import-fields.js for the per-field rules.
 *
 * @param {Array<object>} records Mapped CSV rows.
 * @param {{user_id: string, locator_id: string, allowed_filters?: string[]|null}} owner
 *   `allowed_filters` is the target locator's filter list; filters outside it
 *   are dropped with an issue, because the widget can't ever surface them.
 * @returns {{docs: Array<object>, skipped: number, issues: Array<{row: number, field: string, message: string}>}}
 *   `skipped` counts rows that failed required-field validation — they are
 *   dropped, not fatal. `issues` are per-cell problems on rows that DID import,
 *   each carrying its 1-based row number.
 */
export function buildImportDocs(records, { user_id, locator_id, allowed_filters = null }) {
    const docs = [];
    const issues = [];
    let skipped = 0;

    records.forEach((raw, index) => {
        // Sanitize against NoSQL injection ($-prefixed keys) before validating.
        const clean = sanitizeInput({
            name: text(raw?.name),
            street: text(raw?.street),
            city: text(raw?.city),
            state: text(raw?.state),
            country: text(raw?.country),
            lat: text(raw?.lat ?? raw?.latitude),
            lng: text(raw?.lng ?? raw?.longitude),
            ...Object.fromEntries(PASSTHROUGH_OPTIONAL.map((field) => [field, text(raw?.[field])])),
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
            return;
        }

        // Typed optional columns. sanitizeInput() runs on the PARSED result
        // rather than the raw cells: the parser hands back plain strings,
        // booleans and rebuilt sub-documents, so this only has to strip
        // `$`-prefixed keys that arrived through the REST API's object forms.
        const optional = parseOptionalLocationFields(raw ?? {}, { allowedFilters: allowed_filters });
        for (const issue of optional.issues) {
            issues.push({ row: index + 1, ...issue });
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
            phone: clean.phone,
            email: clean.email,
            website: clean.website,
            ...optionalDefaults(),
            ...sanitizeInput(optional.values),
        });
    });

    return { docs, skipped, issues };
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
