import {
    authenticateApiKey,
    jsonError,
    jsonValidationError,
    jsonSuccess,
    requireOwnedLocator,
    withServerError,
} from '@/lib/api-auth';
import { readJsonBody } from '@/lib/api-payloads';
import { LIMITS } from '@/lib/api-sanitize';
import { IMPORT_MODES, buildImportDocs, writeImportDocs } from '@/lib/import-csv';

// REST equivalent of importCSV() — src/actions/locations.js
//
//   POST /api/v1/locations/import-csv
//   Authorization: Bearer sf_live_...
//   {
//     "locator_id": "6864f1c2a7b3e10d9c4f2a11",
//     "mode": "append" | "replace" | "update",
//     "records": [
//       { "name": "…", "street": "…", "city": "…", "state": "…", "postal": "…",
//         "country": "us", "lat": 14.5353, "lng": 120.9822,
//         "phone": "…", "email": "…", "website": "…" }
//     ]
//   }
//
// A record may also carry any of the optional columns in CSV_OPTIONAL_FIELDS
// (src/lib/csv-import-fields.js) — location_status, filters, hours_mon…hours_sun,
// holidays, view_location_url, social_media_links, published, show_opening_hours,
// custom_notes. Each is accepted either in its CSV string form ("08:00-17:00",
// "facebook=https://…") or in the JSON form the rest of this API uses (a real
// boolean, an array of filters, a whole `hours` object) — parseOptionalLocationFields()
// takes both. A value it can't parse doesn't fail the record: the field falls
// back to its default and the reason comes back in `issues`.
//
// DELIBERATELY UNDOCUMENTED. Like /api/v1/billing-status, this route is not
// listed in ENDPOINT_GROUPS on /dashboard/api-access: it exists so the WordPress
// plugin's "Import CSV" screen can do what the dashboard wizard does, and its
// request shape follows the CSV columns rather than the location model. Callers
// that want to create locations one at a time should use POST /api/v1/locations,
// which is the documented, stable surface.
//
// `import-csv` is a static segment, so Next.js matches it here before it ever
// considers the sibling `[id]` route.
//
// Row validation, the default business hours and the per-mode writes all live in
// src/lib/import-csv.js, shared with the dashboard action — so a row accepted
// here is accepted there, and vice versa.
export async function POST(request) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    // A CSV import is many records in one body, so the default 256KB gate would
    // reject imports the dashboard accepts. The per-string, per-object and
    // array-length caps in sanitizeMongoInput() are unchanged, which is what
    // keeps `records` bounded at LIMITS.arrayLength rows per request.
    //
    // 4MB rather than the 1MB this used to be: a record now carries up to 26
    // columns (hours per day, holidays, social links, custom notes) where it once
    // carried 11 short ones, so a full 500-row batch of rich records no longer
    // fits in 1MB. The row cap, not the byte cap, is what is meant to bound this.
    const { body, errors: bodyErrors } = await readJsonBody(request, { maxBytes: 4 * 1024 * 1024 });
    if (bodyErrors) return jsonValidationError(bodyErrors);

    const errors = {};

    // Whitelisted rather than "anything that isn't replace/update is an append":
    // a typo in `mode` must not silently pick a destructive branch.
    const mode = typeof body.mode === 'string' ? body.mode.trim().toLowerCase() : '';
    if (!IMPORT_MODES.includes(mode)) {
        errors.mode = `Mode must be one of: ${IMPORT_MODES.join(', ')}`;
    }

    const records = body.records;
    if (!Array.isArray(records) || records.length === 0) {
        errors.records = 'No rows to import';
    } else if (records.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
        errors.records = 'Each record must be an object';
    }

    if (Object.keys(errors).length > 0) return jsonValidationError(errors);

    // Authorization: the rows are only ever written into a locator the caller owns.
    const owned = await requireOwnedLocator(auth.user_id, body.locator_id);
    if (owned.error) return owned.error;

    return withServerError(async () => {
        // Rows that fail validation are counted and dropped, exactly as the
        // dashboard wizard does — one bad row must not fail the whole file.
        const { docs, skipped, issues } = buildImportDocs(records, {
            user_id: auth.user_id,
            locator_id: body.locator_id,
            // Filters are the locator's own categories; anything else is dropped
            // with an issue, since the widget's filter bar is built from this list.
            allowed_filters: Array.isArray(owned.locator.filters) ? owned.locator.filters : [],
        });

        if (docs.length === 0) {
            return jsonError(
                'No valid rows to import. Check that required fields are filled and coordinates are valid numbers.',
                400,
                { skipped, total: records.length }
            );
        }

        const { imported, updated } = await writeImportDocs({
            user_id: auth.user_id,
            locator_id: body.locator_id,
            mode,
            docs,
        });

        return jsonSuccess('Import completed successfully.', {
            imported,
            updated,
            skipped,
            total: records.length,
            // Optional values that couldn't be parsed into the type the schema
            // declares. The record still imported with that field defaulted, so
            // this is the only place a caller learns the value was rejected.
            // Capped so a badly-formed file can't return more than it sent.
            issue_count: issues.length,
            issues: issues.slice(0, 50),
            // Echoed so a client that chunks a large file can confirm the cap it
            // has to split on without hard-coding it.
            max_records_per_request: LIMITS.arrayLength,
        });
    }, auth);
}
