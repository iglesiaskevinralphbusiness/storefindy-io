'use client';
// The AI clean-up pass for the CSV import wizard.
//
// WHERE THIS SITS
//   CSV parsed -> columns mapped -> [ THIS ] -> parseOptionalLocationFields()
//   -> preview -> merchant approves -> importCSV() -> buildImportDocs() -> Mongo
//
// It produces a *proposal*: a list of per-cell changes the merchant sees, can
// reject, and must accept before anything is written. Nothing here touches the
// database, and the server re-validates the accepted rows regardless.
//
// TWO PASSES, IN THIS ORDER
//   1. Rules (src/lib/ai/rules/) - instant, offline, and the source of almost
//      every fix: whitespace, casing, phone punctuation, missing URL schemes,
//      and free-text opening hours expanded into the seven per-day columns.
//   2. Embeddings - used for exactly one job the rules cannot do: matching a
//      value the merchant *wrote* to a value the system *allows*. "Wi-Fi
//      (free)" to the locator's own "Free Wifi" filter; "temporarily shut" to
//      `temporarily_closed`; "Philipines" to "Philippines". The model only ever
//      ranks a fixed list of legal values, so it can never produce a new one.
//
// EVERY PROPOSED CHANGE IS RE-VALIDATED. A change is kept only if running
// parseOptionalLocationFields() over the cleaned row produces no issue the
// original row didn't already have. A clean-up that would break a cell is
// discarded before the merchant ever sees it.
import {
    CSV_FIELD_LABELS,
    LOCATION_STATUSES,
    parseOptionalLocationFields,
} from '@/lib/csv-import-fields';
import { COUNTRIES } from '@/utils/constant/countries';
import { cleanField } from './rules/normalize';
import { expandHoursText, HOURS_COLUMNS } from './rules/hours';
import { embedTexts } from './worker-client';
import { rank } from './vector';

/**
 * A mapping target that is not a database field: a single free-text column
 * holding a whole week's schedule ("Mon-Fri 9-6, Sat 10-4"). The cleaner
 * expands it into the seven `hours_*` columns that already exist and then drops
 * it, so no new field ever reaches the schema.
 */
export const HOURS_TEXT_FIELD = 'hours_text';

export const HOURS_TEXT_LABEL = 'Opening hours (free text)';

/** Header spellings that should auto-map to the free-text hours column. */
export const HOURS_TEXT_SYNONYMS = [
    'hours', 'opening_hours', 'open_hours', 'business_hours', 'store_hours',
    'schedule', 'trading_hours', 'hours_of_operation', 'operating_hours', 'times',
];

/** How many rows are cleaned between progress reports and cancellation checks. */
const ROW_BATCH = 50;

/**
 * Similarity floor for accepting a semantic match. Tuned so that a genuine
 * rewording clears it and an unrelated value does not - below this the cell is
 * left alone and reported, which is the safe direction to be wrong in.
 */
const MATCH_THRESHOLD = 0.62;

const text = (value) => String(value ?? '').trim();

/* --------------------------------------------------------------------- *
 * Pass 1 - rules
 * ------------------------------------------------------------------ */

/**
 * Rule-only clean-up for one mapped row.
 *
 * @returns {{ next: object, changes: Array<{field, from, to, note, source}> }}
 *   `next` is the row as it would be after every change; the caller decides
 *   whether to keep them.
 */
function cleanRowWithRules(row) {
    const next = { ...row };
    const changes = [];

    // Free-text hours first: it writes the per-day columns that the per-cell
    // rules below then see, so a file carrying both a summary column and a few
    // day columns ends up consistent, with the explicit day columns winning.
    const hoursText = text(row[HOURS_TEXT_FIELD]);
    if (hoursText) {
        const { values, notes, understood } = expandHoursText(hoursText);
        if (understood) {
            for (const [column, value] of Object.entries(values)) {
                // An explicit per-day cell the merchant filled in is authoritative.
                if (text(row[column])) continue;
                next[column] = value;
                changes.push({
                    field: column,
                    from: '',
                    to: value,
                    note: `from "${hoursText}"`,
                    source: 'rule',
                });
            }
        }
        for (const note of notes) {
            changes.push({ field: HOURS_TEXT_FIELD, from: hoursText, to: hoursText, note, source: 'warning' });
        }
    }

    // Per-day hours cells that are themselves free text ("Closed", "9 to 5").
    for (const column of HOURS_COLUMNS) {
        const value = text(next[column]);
        if (!value) continue;
        const { values, understood } = expandHoursText(value);
        // A single cell describes a single day, so take whichever day the text
        // resolved to - but only when it produced exactly one, otherwise the
        // cell is saying something about days other than its own column.
        const distinct = [...new Set(Object.values(values))];
        if (!understood || distinct.length !== 1 || distinct[0] === value) continue;
        next[column] = distinct[0];
        changes.push({ field: column, from: value, to: distinct[0], note: 'reformatted', source: 'rule' });
    }

    // Plain-text columns.
    for (const [field, value] of Object.entries(next)) {
        if (field === HOURS_TEXT_FIELD || HOURS_COLUMNS.includes(field)) continue;
        if (typeof value !== 'string') continue;

        const { value: cleaned, note } = cleanField(field, value);
        if (cleaned === value) {
            // The cleaner left the cell alone but had something to say about it
            // - an unrecoverable Excel-mangled phone, a "website" that is really
            // a sentence. Worth surfacing even though nothing changed, because
            // it is exactly the cell the merchant should look at.
            if (note) changes.push({ field, from: value, to: value, note, source: 'warning' });
            continue;
        }
        next[field] = cleaned;
        changes.push({ field, from: value, to: cleaned, note, source: 'rule' });
    }

    return { next, changes };
}

/* --------------------------------------------------------------------- *
 * Pass 2 - semantic matching against a fixed list of legal values
 * ------------------------------------------------------------------ */

/**
 * Build the candidate lists a value can be matched *to*. Every list is closed:
 * the locator's own filters, the three location statuses, the country table.
 */
function buildTargets(allowedFilters) {
    return {
        filters: allowedFilters.map((filter) => ({ value: filter, label: filter })),
        location_status: LOCATION_STATUSES.map((status) => ({
            value: status,
            // The model sees a phrase, not a snake_case key - "temporarily
            // closed" embeds far closer to "temporarily shut" than
            // "temporarily_closed" does.
            label: status.replace(/_/g, ' '),
        })),
        country: COUNTRIES.map((country) => ({ value: country.code, label: country.label })),
    };
}

/**
 * Collect the cells the rules couldn't resolve and a semantic match could.
 * Returns one entry per *distinct* value, so a 5,000-row file with six distinct
 * filter spellings embeds six strings, not five thousand.
 */
function collectSemanticQueries(rows, targets, allowedFilters) {
    const queries = new Map(); // `${field} ${value}` -> { field, value, key }

    const add = (field, value) => {
        const key = `${field} ${value.toLowerCase()}`;
        if (!queries.has(key)) queries.set(key, { field, value, key });
    };

    const known = {
        filters: new Set(allowedFilters.map((filter) => filter.toLowerCase())),
        location_status: new Set(targets.location_status.flatMap((target) => [target.value, target.label])),
        country: new Set(targets.country.flatMap((target) => [target.value, target.label.toLowerCase()])),
    };

    for (const row of rows) {
        const status = text(row.location_status).toLowerCase();
        if (status && !known.location_status.has(status)) add('location_status', text(row.location_status));

        const country = text(row.country).toLowerCase();
        if (country && !known.country.has(country)) add('country', text(row.country));

        const filters = text(row.filters);
        if (filters && allowedFilters.length) {
            for (const part of filters.split(/[|;,]/).map((piece) => piece.trim()).filter(Boolean)) {
                if (!known.filters.has(part.toLowerCase())) add('filters', part);
            }
        }
    }

    return [...queries.values()];
}

/**
 * Embed the unresolved values and the legal values they might mean, and keep
 * the pairings that clear MATCH_THRESHOLD.
 *
 * @returns {Promise<Map<string, { value: string, score: number }>>} Keyed by
 *   the query key, so the row pass can look a cell up without re-embedding.
 */
async function resolveSemanticMatches(queries, targets, options) {
    const resolved = new Map();
    if (queries.length === 0) return resolved;

    // Only embed the target lists a query actually needs - the country table is
    // 250 strings and there is no reason to pay for it when no country is off.
    const neededFields = [...new Set(queries.map((query) => query.field))];
    const targetTexts = [];
    const targetIndex = new Map();
    for (const field of neededFields) {
        const list = targets[field] ?? [];
        if (list.length === 0) continue;
        targetIndex.set(field, { start: targetTexts.length, list });
        targetTexts.push(...list.map((target) => target.label));
    }
    if (targetTexts.length === 0) return resolved;

    const all = await embedTexts([...targetTexts, ...queries.map((query) => query.value)], options);
    const targetVectors = all.slice(0, targetTexts.length);
    const queryVectors = all.slice(targetTexts.length);

    queries.forEach((query, index) => {
        const slot = targetIndex.get(query.field);
        if (!slot) return;

        const candidates = slot.list.map((target, offset) => ({
            value: target.value,
            vector: targetVectors[slot.start + offset],
        }));
        const [best] = rank(queryVectors[index], candidates, { threshold: MATCH_THRESHOLD, limit: 1 });
        if (best) resolved.set(query.key, { value: best.value, score: best.score });
    });

    return resolved;
}

/** Apply the resolved matches to one row. */
function applySemanticMatches(row, resolved, allowedFilters) {
    const next = { ...row };
    const changes = [];

    const lookup = (field, value) => resolved.get(`${field} ${value.toLowerCase()}`);

    for (const field of ['location_status', 'country']) {
        const value = text(next[field]);
        if (!value) continue;
        const match = lookup(field, value);
        if (!match || match.value === value) continue;
        next[field] = match.value;
        changes.push({
            field,
            from: value,
            to: match.value,
            note: 'matched to the closest supported value',
            source: 'ai',
        });
    }

    const filters = text(next.filters);
    if (filters && allowedFilters.length) {
        const parts = filters.split(/[|;,]/).map((part) => part.trim()).filter(Boolean);
        const mapped = [];
        let touched = false;
        for (const part of parts) {
            const match = lookup('filters', part);
            if (match && match.value !== part) {
                touched = true;
                if (!mapped.includes(match.value)) mapped.push(match.value);
            } else if (!mapped.includes(part)) {
                mapped.push(part);
            }
        }
        if (touched) {
            const value = mapped.join('|');
            next.filters = value;
            changes.push({
                field: 'filters',
                from: filters,
                to: value,
                note: "matched to this locator's own filters",
                source: 'ai',
            });
        }
    }

    return { next, changes };
}

/* --------------------------------------------------------------------- *
 * Validation gate
 * ------------------------------------------------------------------ */

/** The set of `field: message` issues a row produces today. */
function issueKeys(row, allowedFilters) {
    const { issues } = parseOptionalLocationFields(row, { allowedFilters });
    return new Set(issues.map((issue) => `${issue.field}:${issue.message}`));
}

/**
 * Drop any change that makes the row worse.
 *
 * Changes are removed one at a time until the cleaned row carries no issue the
 * original didn't. A rule that misfires on one unusual cell therefore costs
 * that cell and nothing else.
 */
function keepOnlySafeChanges(original, cleaned, changes, allowedFilters) {
    if (changes.length === 0) return { next: cleaned, changes };

    const before = issueKeys(original, allowedFilters);
    let kept = changes;
    let next = cleaned;

    // At most one pass per change: each iteration removes exactly one.
    for (let attempt = 0; attempt <= changes.length; attempt++) {
        const introduced = [...issueKeys(next, allowedFilters)].filter((key) => !before.has(key));
        if (introduced.length === 0) break;

        // Blame the change whose field the new issue names, else the last one.
        const blamedField = introduced[0].split(':')[0];
        const index = kept.findIndex((change) => change.field === blamedField);
        const drop = index === -1 ? kept.length - 1 : index;
        if (drop < 0) break;

        kept = kept.filter((_, position) => position !== drop);
        next = { ...original };
        for (const change of kept) next[change.field] = change.to;
    }

    return { next, changes: kept };
}

/* --------------------------------------------------------------------- *
 * Entry point
 * ------------------------------------------------------------------ */

/**
 * Clean every mapped row.
 *
 * @param {Array<object>} rows Mapped rows, `{ [csv field]: string }`.
 * @param {object} options
 * @param {string[]} options.allowedFilters The target locator's filter list.
 * @param {(p: {stage: string, loaded: number, total: number, percent: number}) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal] Cancels between batches.
 * @param {boolean} [options.useSemantic=true] When false only the rules run and
 *   no model is loaded at all. This is the fallback for a device that can't run
 *   AI, and it still fixes the large majority of a typical file.
 * @returns {Promise<{ rows: object[], proposals: Array<{row: number, changes: object[]}>, stats: object }>}
 *   `rows` is the cleaned set, aligned with the input by index. `proposals`
 *   holds only the rows that changed, with a 0-based `row` index.
 */
export async function cleanCsvRows(rows, {
    allowedFilters = [],
    onProgress,
    signal,
    useSemantic = true,
} = {}) {
    const targets = buildTargets(allowedFilters);

    // Semantic pass first, over distinct values only, so the per-row loop below
    // is pure synchronous work with a known cost.
    let resolved = new Map();
    let semanticFailed = '';
    if (useSemantic) {
        const queries = collectSemanticQueries(rows, targets, allowedFilters);
        if (queries.length) {
            onProgress?.({ stage: 'model', loaded: 0, total: queries.length, percent: 0 });
            try {
                resolved = await resolveSemanticMatches(queries, targets, {
                    signal,
                    onProgress: (event) => onProgress?.({
                        ...event,
                        stage: event.stage === 'download' ? 'model' : 'match',
                    }),
                });
            } catch (error) {
                if (error?.name === 'AbortError') throw error;
                // The rules stand on their own - a model that won't load
                // downgrades the result, it doesn't fail the clean-up.
                semanticFailed = error?.message || 'AI is unavailable right now.';
            }
        }
    }

    const cleaned = [];
    const proposals = [];

    for (let index = 0; index < rows.length; index++) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

        const original = rows[index];
        const ruled = cleanRowWithRules(original);
        const matched = applySemanticMatches(ruled.next, resolved, allowedFilters);

        const all = [...ruled.changes, ...matched.changes];
        // `warning` entries are commentary, not edits, so they bypass the gate.
        const edits = all.filter((change) => change.source !== 'warning');
        const warnings = all.filter((change) => change.source === 'warning');

        const safe = keepOnlySafeChanges(original, matched.next, edits, allowedFilters);

        // The free-text hours column has done its job; it is not a schema field
        // and must not travel any further towards the database.
        const row = { ...safe.next };
        delete row[HOURS_TEXT_FIELD];
        cleaned.push(row);

        if (safe.changes.length || warnings.length) {
            proposals.push({ row: index, changes: [...safe.changes, ...warnings] });
        }

        if (index % ROW_BATCH === 0 || index === rows.length - 1) {
            onProgress?.({
                stage: 'clean',
                loaded: index + 1,
                total: rows.length,
                percent: Math.round(((index + 1) / rows.length) * 100),
            });
            // Yield to the event loop so the cancel button stays responsive on
            // a large file. The rules are fast, but 5,000 rows of them are not.
            await Promise.resolve();
        }
    }

    return {
        rows: cleaned,
        proposals,
        stats: {
            rowsChanged: proposals.filter((p) => p.changes.some((c) => c.source !== 'warning')).length,
            cellsChanged: proposals.reduce((sum, p) => sum + p.changes.filter((c) => c.source !== 'warning').length, 0),
            semanticMatches: proposals.reduce((sum, p) => sum + p.changes.filter((c) => c.source === 'ai').length, 0),
            warnings: proposals.reduce((sum, p) => sum + p.changes.filter((c) => c.source === 'warning').length, 0),
            semanticFailed,
        },
    };
}

/**
 * Suggest a Storefindy field for each CSV header the wizard's exact-synonym
 * matching left unmapped.
 *
 * The wizard's own autoMatch() handles known spellings; this covers the rest -
 * "Branch Telephone", "Shop Website", "Trading Times" - by ranking each header
 * against a description of every field still free. Suggestions are proposals:
 * the wizard shows them pre-selected and the merchant can change any of them.
 *
 * @param {string[]} headers Unmapped CSV headers.
 * @param {Array<{ field: string, label: string }>} fields Fields still available.
 * @returns {Promise<Record<string, { field: string, score: number }>>} By header.
 */
export async function suggestFieldMapping(headers, fields, options = {}) {
    const suggestions = {};
    if (headers.length === 0 || fields.length === 0) return suggestions;

    const vectors = await embedTexts([...fields.map((field) => field.label), ...headers], options);
    const fieldVectors = vectors.slice(0, fields.length);
    const headerVectors = vectors.slice(fields.length);

    // Best-match-first across the whole grid, so two headers never claim the
    // same field and the stronger pairing wins when they compete.
    const pairs = [];
    headers.forEach((header, headerIndex) => {
        fields.forEach((field, fieldIndex) => {
            const query = headerVectors[headerIndex];
            const target = fieldVectors[fieldIndex];
            let score = 0;
            for (let i = 0; i < query.length; i++) score += query[i] * target[i];
            pairs.push({ header, field: field.field, score });
        });
    });
    pairs.sort((a, b) => b.score - a.score);

    const taken = new Set();
    for (const pair of pairs) {
        if (pair.score < MATCH_THRESHOLD) break;
        if (suggestions[pair.header] || taken.has(pair.field)) continue;
        suggestions[pair.header] = { field: pair.field, score: pair.score };
        taken.add(pair.field);
    }

    return suggestions;
}

/** Human label for a field in the proposal list, including the AI-only one. */
export const cleanerFieldLabel = (field) => (
    field === HOURS_TEXT_FIELD ? HOURS_TEXT_LABEL : (CSV_FIELD_LABELS[field] ?? field)
);
