// Expands a free-text opening-hours schedule into the seven per-day CSV cells
// the importer already understands.
//
// WHY THIS IS RULES AND NOT A MODEL
// The task is a closed one: seven day names, a handful of range words, and a
// clock format that src/lib/csv-import-fields.js already parses. A language
// model asked to do it would sometimes return "18:00" for a shop that closes at
// 6am, and there would be no way to tell which times it read and which it
// guessed. These rules only ever move text that is present in the input, and
// anything they cannot account for is reported rather than filled in.
//
// The output is deliberately CSV cell strings (`hours_mon: '09:00-18:00'`), not
// the `hours.Mon` sub-documents the schema stores. That keeps this module on
// the *input* side of parseOptionalLocationFields(), which then validates the
// expansion exactly as it validates a hand-written file — one gate for both.
import { parseTimeOfDay } from '@/lib/csv-import-fields';

/** CSV column per day, in week order — the order ranges are resolved against. */
const DAY_COLUMNS = ['hours_mon', 'hours_tue', 'hours_wed', 'hours_thu', 'hours_fri', 'hours_sat', 'hours_sun'];

/**
 * Day spellings, longest first so `thursday` is matched before `thu` and `thu`
 * before `t`. Index into DAY_COLUMNS.
 */
const DAY_WORDS = [
    ['monday', 0], ['mondays', 0], ['mon', 0], ['mo', 0],
    ['tuesday', 1], ['tuesdays', 1], ['tues', 1], ['tue', 1], ['tu', 1],
    ['wednesday', 2], ['wednesdays', 2], ['weds', 2], ['wed', 2], ['we', 2],
    ['thursday', 3], ['thursdays', 3], ['thurs', 3], ['thur', 3], ['thu', 3], ['th', 3],
    ['friday', 4], ['fridays', 4], ['fri', 4], ['fr', 4],
    ['saturday', 5], ['saturdays', 5], ['sat', 5], ['sa', 5],
    ['sunday', 6], ['sundays', 6], ['sun', 6], ['su', 6],
].sort((a, b) => b[0].length - a[0].length);

/**
 * Single-letter days. `T` and `S` are genuinely ambiguous (Tuesday/Thursday,
 * Saturday/Sunday); the conventional reading is used and the caller is told, so
 * the merchant can check that one cell rather than the whole file.
 */
const DAY_LETTERS = { m: 0, t: 1, w: 2, r: 3, f: 4, s: 5, u: 6 };
const AMBIGUOUS_LETTERS = new Set(['t', 's']);

/** Group words that stand for a run of days. */
const DAY_GROUPS = {
    weekday: [0, 1, 2, 3, 4],
    weekdays: [0, 1, 2, 3, 4],
    'week days': [0, 1, 2, 3, 4],
    'business days': [0, 1, 2, 3, 4],
    weekend: [5, 6],
    weekends: [5, 6],
    'week ends': [5, 6],
    daily: [0, 1, 2, 3, 4, 5, 6],
    everyday: [0, 1, 2, 3, 4, 5, 6],
    'every day': [0, 1, 2, 3, 4, 5, 6],
    'all week': [0, 1, 2, 3, 4, 5, 6],
    'all days': [0, 1, 2, 3, 4, 5, 6],
    '7 days': [0, 1, 2, 3, 4, 5, 6],
    'seven days': [0, 1, 2, 3, 4, 5, 6],
};

const CLOSED_RE = /\b(closed|close|shut)\b/;
const ALL_DAY_RE = /\b(24\s*\/\s*7|24\s*hours?|24\s*hrs?|24h|open\s+24|always\s+open|round\s+the\s+clock)\b/;

/** Words that join two days into an inclusive range. */
const RANGE_WORDS = /\s*(?:-{1,2}|–|—|~|\bto\b|\bthrough\b|\bthru\b|\btil{1,2}\b|\buntil\b)\s*/;

const clean = (raw) => String(raw ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Split a schedule into the clauses that each describe one set of days.
 *
 * Semicolons, newlines and bullets always separate. A comma usually does too,
 * but not inside a time range like "9:00, 17:00" — which is why the split is
 * followed by a re-join of any fragment that has no day word of its own and
 * starts with a time.
 */
function splitClauses(text) {
    const parts = text.split(/[;\n\r•|]+|,(?![^a-z]*(?:am|pm)\b\s*$)/i)
        .map((part) => part.trim())
        .filter(Boolean);

    const clauses = [];
    for (const part of parts) {
        // A fragment with no day reference belongs to the clause before it
        // ("Mon-Fri 9-6, 7-9 on request" reads as one statement about Mon-Fri).
        if (clauses.length && !hasDayReference(part)) {
            clauses[clauses.length - 1] += `, ${part}`;
        } else {
            clauses.push(part);
        }
    }
    return clauses;
}

function hasDayReference(text) {
    if (DAY_WORDS.some(([word]) => new RegExp(`\\b${word}\\b`).test(text))) return true;
    return Object.keys(DAY_GROUPS).some((group) => text.includes(group));
}

/**
 * Read the day part of a clause.
 *
 * @returns {{ days: number[], rest: string, ambiguous: boolean } | null}
 *   `rest` is what is left once the day words are removed — the time part.
 */
function readDays(clause) {
    let working = clause;
    const days = new Set();
    let ambiguous = false;
    let matched = false;

    // Group words first: "weekdays" must not be read as "we" + "ekdays".
    for (const [group, indexes] of Object.entries(DAY_GROUPS)) {
        if (working.includes(group)) {
            indexes.forEach((index) => days.add(index));
            working = working.replace(group, ' ');
            matched = true;
        }
    }

    // Then explicit ranges and lists of named days.
    const dayToken = DAY_WORDS.map(([word]) => word).join('|');
    const rangeRe = new RegExp(`\\b(${dayToken})\\b${RANGE_WORDS.source}\\b(${dayToken})\\b`, 'g');
    working = working.replace(rangeRe, (full, from, to) => {
        addRange(days, dayIndex(from), dayIndex(to));
        matched = true;
        return ' ';
    });

    const singleRe = new RegExp(`\\b(${dayToken})\\b`, 'g');
    working = working.replace(singleRe, (full, word) => {
        days.add(dayIndex(word));
        matched = true;
        return ' ';
    });

    // Finally single letters, which only count when they look like a day list
    // ("M-F", "MWF") rather than a stray initial in the middle of prose.
    working = working.replace(/\b([mtwrfsu])\s*[-–—]\s*([mtwrfsu])\b/g, (full, from, to) => {
        if (AMBIGUOUS_LETTERS.has(from) || AMBIGUOUS_LETTERS.has(to)) ambiguous = true;
        addRange(days, DAY_LETTERS[from], DAY_LETTERS[to]);
        matched = true;
        return ' ';
    });
    working = working.replace(/\b([mtwrfsu]{2,7})\b(?!\s*[:.]?\s*\d)/g, (full, letters) => {
        // A run of day letters with no repeats — "mwf", "tth". Anything else
        // (a word like "rust", a unit like "ms") is left alone.
        const chars = [...letters];
        if (new Set(chars).size !== chars.length) return full;
        chars.forEach((char) => {
            if (AMBIGUOUS_LETTERS.has(char)) ambiguous = true;
            days.add(DAY_LETTERS[char]);
        });
        matched = true;
        return ' ';
    });

    if (!matched) return null;
    return { days: [...days].sort((a, b) => a - b), rest: working.replace(/\s+/g, ' ').trim(), ambiguous };
}

const dayIndex = (word) => DAY_WORDS.find(([candidate]) => candidate === word)[1];

/** Inclusive day range, wrapping around the week so "Fri-Mon" works. */
function addRange(set, from, to) {
    let index = from;
    for (let step = 0; step < 7; step++) {
        set.add(index);
        if (index === to) return;
        index = (index + 1) % 7;
    }
}

/**
 * Read the time part of a clause into the cell value the importer expects.
 *
 * @returns {{ value: string } | { error: string }}
 */
function readTimes(text) {
    const stripped = text.replace(/^[\s:–—-]+/, '').replace(/[\s:.–—-]+$/, '').trim();

    if (ALL_DAY_RE.test(stripped)) return { value: '24 hours' };
    if (CLOSED_RE.test(stripped)) return { value: 'closed' };
    if (!stripped) return { error: 'no opening time given' };

    // "9-6", "09:00 to 18:00", "9am – 6pm", "9 AM - 6 PM".
    const match = /(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)\s*(?:-{1,2}|–|—|~|to|til{1,2}|until)\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i
        .exec(stripped);
    if (!match) return { error: `couldn't read a time range from "${stripped}"` };

    const rawOpen = match[1].trim();
    const rawClose = match[2].trim();
    const open = parseTimeOfDay(rawOpen);
    let close = parseTimeOfDay(rawClose);
    if (!open || !close) return { error: `couldn't read a time range from "${stripped}"` };

    // "9-6" means nine in the morning to six in the evening. Only applied when
    // the closing time carries no meridiem of its own — an explicit "9am-6am"
    // is left exactly as written and rejected by the validator instead.
    const closeHasMeridiem = /a\.?m\.?|p\.?m\.?/i.test(rawClose);
    if (!closeHasMeridiem && close <= open) {
        const shifted = parseTimeOfDay(`${Number(rawClose.split(':')[0]) + 12}${rawClose.includes(':') ? `:${rawClose.split(':')[1]}` : ''}`);
        if (shifted && shifted > open) close = shifted;
    }

    if (close <= open) return { error: `"${stripped}" closes before it opens` };
    return { value: `${open}-${close}` };
}

/**
 * Expand one free-text schedule.
 *
 * @param {string} raw e.g. "Mon-Fri 9-6, Sat 10-4, Closed Sunday"
 * @returns {{ values: Record<string,string>, notes: string[], understood: boolean }}
 *   `values` holds only the days the text actually named, keyed by CSV column,
 *   so a caller can merge it over whatever the file already supplied without
 *   inventing hours for the days it says nothing about.
 */
export function expandHoursText(raw) {
    const text = clean(raw);
    const values = {};
    const notes = [];
    if (!text) return { values, notes, understood: false };

    // A bare "closed" or "24/7" with no day at all applies to the whole week.
    if (!hasDayReference(text) && !/[mtwrfsu]\s*[-–—]\s*[mtwrfsu]/.test(text)) {
        const times = readTimes(text);
        if (times.error) return { values, notes: [times.error], understood: false };
        DAY_COLUMNS.forEach((column) => { values[column] = times.value; });
        return { values, notes, understood: true };
    }

    let understood = false;
    for (const clause of splitClauses(text)) {
        const parsed = readDays(clause);
        if (!parsed) {
            notes.push(`couldn't tell which day "${clause}" refers to`);
            continue;
        }
        if (parsed.ambiguous) {
            notes.push('single-letter days were read as T=Tuesday and S=Saturday — check these');
        }

        const times = readTimes(parsed.rest);
        if (times.error) {
            notes.push(times.error);
            continue;
        }
        parsed.days.forEach((day) => { values[DAY_COLUMNS[day]] = times.value; });
        understood = true;
    }

    return { values, notes, understood };
}

/** The seven CSV columns this module writes. Exported so callers can diff them. */
export { DAY_COLUMNS as HOURS_COLUMNS };
