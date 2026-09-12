// Opening-hours arithmetic, shared by anything that has to answer "is this
// location open?" away from the browser.
//
// This is the server-side mirror of the schedule maths inside
// src/components/Locator/index.js. The widget keeps its own copy because it also
// renders the badge and the week list from it; this module only answers the
// yes/no questions the AI search asks ("open now", "open 24 hours today",
// "open at night on Friday").
//
// Everything is expressed against a caller-supplied clock — `{ dayIndex,
// minutes, date }` — rather than the server's own. The widget sends the
// VISITOR's clock, so a stored schedule of 8 AM - 5 PM is read as 8 AM - 5 PM
// wherever the page is being viewed from, exactly as the badge does.

/** JS Date.getDay() (0 = Sunday) -> the schema's hours keys. */
export const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Daylight and night windows, in minutes past midnight. Night wraps. */
export const DAYLIGHT_WINDOW = { from: 6 * 60, to: 18 * 60 };
export const NIGHT_WINDOW = { from: 18 * 60, to: 6 * 60 };

/** "08:00" -> 480. Null for anything unparseable. */
export function toMinutes(value) {
    const [h, m] = String(value ?? '').split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
}

/**
 * Date-only arithmetic on a "YYYY-MM-DD" string. Done in UTC deliberately:
 * these are calendar labels used to match special-hours ranges, never instants,
 * so DST must not shift them.
 */
export function addDays(ymd, days) {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/** A clock object from a Date — the shape every function here takes. */
export function clockFrom(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return {
        dayIndex: date.getDay(),
        minutes: date.getHours() * 60 + date.getMinutes(),
        date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    };
}

/**
 * The schedule actually in force on a given date. Special hours (`loc.holidays`)
 * override the weekly schedule for every day they cover — the same precedence
 * the widget's badge uses, so the two can never disagree.
 */
export function daySpec(loc, ymd, dayIndex) {
    const special = (loc.holidays || []).find((h) => h.from <= ymd && ymd <= h.to);
    if (special) return { ...special, isHoliday: true };
    return { ...(loc.hours?.[DAY_KEYS[dayIndex]] || { enabled: false }), isHoliday: false };
}

/**
 * One day's opening span in minutes from that day's midnight, or null when the
 * day is closed. A close time at or before the open time runs past midnight;
 * equal times are the schema's "open 24 hours" convention.
 */
function spanFor(spec) {
    if (!spec?.enabled) return null;
    const open = toMinutes(spec.open);
    const close = toMinutes(spec.close);
    if (open === null || close === null) return null;
    return { start: open, end: close + (close <= open ? 1440 : 0) };
}

/**
 * Every open span around the clock's day, in minutes from that day's midnight
 * (so yesterday is negative). Starts a day early because an overnight span may
 * still be running. Touching spans are merged, so a run of 24-hour days reads as
 * one uninterrupted stretch.
 */
export function openIntervals(loc, base, { back = 1, forward = 1 } = {}) {
    const spans = [];
    for (let offset = -back; offset <= forward; offset++) {
        const dayIndex = (base.dayIndex + offset + 7) % 7;
        const span = spanFor(daySpec(loc, addDays(base.date, offset), dayIndex));
        if (!span) continue;
        spans.push({ start: offset * 1440 + span.start, end: offset * 1440 + span.end });
    }
    spans.sort((a, b) => a.start - b.start);
    return spans.reduce((merged, span) => {
        const last = merged[merged.length - 1];
        if (last && span.start <= last.end) {
            last.end = Math.max(last.end, span.end);
            return merged;
        }
        merged.push({ ...span });
        return merged;
    }, []);
}

/**
 * A location the merchant has flagged as not trading. Its stored schedule is
 * still in the database but must never be quoted, so every "open" question
 * answers no for it and every "closed" question answers yes.
 */
export function isTradingClosed(loc) {
    return loc?.location_status === 'temporarily_closed' || loc?.location_status === 'coming_soon';
}

/** Open at the clock's exact moment. */
export function isOpenAt(loc, base) {
    if (isTradingClosed(loc)) return false;
    if (!loc?.hours) return false;
    return openIntervals(loc, base).some((i) => i.start <= base.minutes && base.minutes < i.end);
}

/** Trading at all on a given day — regardless of the time. */
export function isOpenOnDay(loc, ymd, dayIndex) {
    if (isTradingClosed(loc)) return false;
    return !!spanFor(daySpec(loc, ymd, dayIndex));
}

/**
 * Open around the clock on a given day. The schema writes that as equal open and
 * close times; a span covering all but a minute of the day ("00:00" - "23:59")
 * is treated as the same intent.
 */
export function isOpen24On(loc, ymd, dayIndex) {
    if (isTradingClosed(loc)) return false;
    const span = spanFor(daySpec(loc, ymd, dayIndex));
    return !!span && span.end - span.start >= 1439;
}

/** Overlap between two [start, end) ranges of minutes. */
function overlaps(a, b) {
    return a.start < b.end && b.start < a.end;
}

/**
 * Open at any point inside a window on a given day. The window may wrap past
 * midnight (night is 18:00 - 06:00), in which case it is tested as two pieces.
 * The day's own span is tested twice as well — once as itself and once shifted
 * back a day — so an overnight span opened yesterday still counts as covering
 * this morning.
 */
export function isOpenDuringWindow(loc, ymd, dayIndex, window) {
    if (isTradingClosed(loc)) return false;

    const windows = window.to > window.from
        ? [{ start: window.from, end: window.to }]
        : [{ start: window.from, end: 1440 }, { start: 0, end: window.to }];

    const spans = [];
    const today = spanFor(daySpec(loc, ymd, dayIndex));
    if (today) spans.push(today);
    const yesterday = spanFor(daySpec(loc, addDays(ymd, -1), (dayIndex + 6) % 7));
    if (yesterday && yesterday.end > 1440) spans.push({ start: yesterday.start - 1440, end: yesterday.end - 1440 });

    return spans.some((span) => windows.some((w) => overlaps(span, w)));
}

/**
 * The dates the clock's week resolves to, keyed by day index. Rows look FORWARD:
 * each weekday resolves to its next occurrence with today at offset 0, which is
 * what keeps a passed holiday range from being matched against an upcoming day.
 */
export function upcomingDates(base) {
    const dates = {};
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        dates[dayIndex] = addDays(base.date, (dayIndex - base.dayIndex + 7) % 7);
    }
    return dates;
}
