// The opening-hours half of a described search.
//
// ONE MATCHER, TWO PAGES.
// matchesSchedule() below is the function the storefront locator has always
// used to answer "which of these are open right now?" — lib/ai/locator-search.js
// imports it from here rather than keeping its own copy. The dashboard's
// Locations page calls the same function over the same rows. That is what makes
// "open on saturday and sunday" mean the same thing in both places: not two
// implementations kept in step by hand, but one.
//
// A schedule condition CANNOT be a MongoDB term. Opening hours are seven
// sub-documents plus a list of special-hours ranges, read against a clock, with
// spans that run past midnight and holidays that override the week. That is
// lib/locator-hours.js, and it is arithmetic, not a query. So the Locations page
// applies its cheap columns in Mongo, then runs this over what comes back —
// see the schedule pass in lib/locations-query.js.
import { z } from 'zod';
import {
    DAYLIGHT_WINDOW,
    NIGHT_WINDOW,
    isOpen24On,
    isOpenAt,
    isOpenDuringWindow,
    isOpenOnDay,
    isTradingClosed,
    upcomingDates,
} from '@/lib/locator-hours';

/**
 * The URL parameter the viewer's UTC offset travels in, beside the filter list.
 *
 * Separate from the filter itself because it is not a condition — it is how to
 * read one. "Open now" bookmarked today must still mean now next week, so what
 * is stored is the offset, and the moment is worked out on each request.
 */
export const TZ_PARAM = 'tzo';

/** Day names by JS `Date.getDay()` index, which is what `days` holds. */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * A schedule condition, as it travels in the URL.
 *
 * Every field mirrors one the locator's prompt parser already produces, because
 * this IS that subset of its intent — see scheduleFromIntent(). Bounded on every
 * axis: the day list is seven small integers, the window two minute counts, and
 * everything else a flag. Nothing here is ever used as a Mongo key or operator;
 * it never reaches Mongo at all.
 */
export const scheduleValueSchema = z.object({
    days: z.array(z.number().int().min(0).max(6)).max(7).optional().default([]),
    today: z.boolean().optional().default(false),
    tomorrow: z.boolean().optional().default(false),
    window: z.object({
        // Up to 2879 because a window may run past midnight into the next day.
        from: z.number().int().min(0).max(2879),
        to: z.number().int().min(0).max(2879),
    }).nullable().optional().default(null),
    open24: z.boolean().optional().default(false),
    closed: z.boolean().optional().default(false),
    openNow: z.boolean().optional().default(false),
    daylight: z.boolean().optional().default(false),
    night: z.boolean().optional().default(false),
});

/** Does this value actually say anything about opening hours? */
export function hasScheduleCondition(value) {
    if (!value || typeof value !== 'object') return false;
    return !!(
        value.openNow || value.open24 || value.closed || value.daylight || value.night ||
        value.today || value.tomorrow || value.window || (value.days && value.days.length)
    );
}

/**
 * The schedule part of a parsed locator prompt, or null when it said nothing
 * about opening hours.
 *
 * Deliberately a projection rather than a copy of the whole intent: what goes in
 * the URL should be the condition, not the sentence that produced it.
 */
export function scheduleFromIntent(intent) {
    if (!intent?.hasSchedule) return null;

    const value = {
        days: Array.isArray(intent.days) ? [...intent.days] : [],
        today: !!intent.today,
        tomorrow: !!intent.tomorrow,
        window: intent.window ? { from: intent.window.from, to: intent.window.to } : null,
        open24: !!intent.open24,
        closed: !!intent.closed,
        openNow: !!intent.openNow,
        daylight: !!intent.daylight,
        night: !!intent.night,
    };

    return hasScheduleCondition(value) ? value : null;
}

/* --------------------------------------------------------------------- *
 * The matcher
 * ------------------------------------------------------------------ */

/**
 * Does the location satisfy everything the prompt said about opening times?
 *
 * The order of the branches is the reading order of a sentence: "open 24 hours"
 * beats a window, a window beats a bare day, and a bare day beats "right now".
 * `closed` inverts whichever of those applied, so "closed on monday" is exactly
 * "not open on monday" and can never drift from it.
 *
 * @param {object} location A location row, with `hours`, `holidays` and
 *   `location_status`.
 * @param {object} value A schedule condition — scheduleValueSchema, or any
 *   parsed locator intent, which is a superset of it.
 * @param {{dayIndex: number, minutes: number, date: string}} clock The VIEWER's
 *   clock. Opening hours are read at face value against it, which is the rule
 *   the widget's own open/closed badge follows.
 */
export function matchesSchedule(location, value, clock) {
    if (!hasScheduleCondition(value)) return true;

    const dates = upcomingDates(clock);
    const explicitDays = value.days?.length
        ? value.days
        : value.tomorrow
            ? [(clock.dayIndex + 1) % 7]
            : value.today
                ? [clock.dayIndex]
                : [];
    // With no day named, every question is about today — "open 24 hours",
    // "open at night" and "open 9 to 5" all mean today unless told otherwise.
    const days = explicitDays.length ? explicitDays : [clock.dayIndex];

    // A location the merchant flagged as temporarily closed or coming soon is
    // never "open", and is always an answer to "which ones are closed".
    if (isTradingClosed(location)) return !!value.closed;

    if (value.open24) {
        const open = days.every((day) => isOpen24On(location, dates[day], day));
        return value.closed ? !open : open;
    }

    const window = value.night ? NIGHT_WINDOW : value.daylight ? DAYLIGHT_WINDOW : value.window;
    if (window) {
        const open = days.every((day) => isOpenDuringWindow(location, dates[day], day, window));
        return value.closed ? !open : open;
    }

    if (explicitDays.length) {
        const open = explicitDays.every((day) => isOpenOnDay(location, dates[day], day));
        return value.closed ? !open : open;
    }

    if (value.openNow) return isOpenAt(location, clock);
    if (value.closed) return !isOpenAt(location, clock);
    return true;
}

/* --------------------------------------------------------------------- *
 * Reading it back out
 * ------------------------------------------------------------------ */

function clockLabel(minutes) {
    const total = ((minutes % 1440) + 1440) % 1440;
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    const suffix = hour < 12 ? 'AM' : 'PM';
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return minute ? `${display}:${String(minute).padStart(2, '0')} ${suffix}` : `${display} ${suffix}`;
}

/** The chip above the results table, in the merchant's own words. */
export function describeSchedule(value) {
    if (!hasScheduleCondition(value)) return '';

    const verb = value.closed ? 'Closed' : 'Open';
    const when = [];

    if (value.open24) when.push('24 hours');
    if (value.night) when.push('at night');
    else if (value.daylight) when.push('during the day');
    else if (value.window) {
        // A one-minute window is a moment the merchant named, not a range.
        when.push(value.window.to - value.window.from <= 1
            ? `at ${clockLabel(value.window.from)}`
            : `between ${clockLabel(value.window.from)} and ${clockLabel(value.window.to)}`);
    }

    if (value.days?.length) when.push(`on ${value.days.map((day) => DAY_SHORT[day]).join(', ')}`);
    else if (value.tomorrow) when.push('tomorrow');
    else if (value.today) when.push('today');
    else if (!when.length) when.push('now');

    return `${verb} ${when.join(' ')}`.trim();
}

/* --------------------------------------------------------------------- *
 * The clock
 * ------------------------------------------------------------------ */

/**
 * The viewer's clock, from the UTC offset their browser reported.
 *
 * The offset travels rather than the clock itself, so a bookmarked "open now"
 * search is still about now when it is reopened tomorrow. `offsetMinutes` is
 * what `Date.prototype.getTimezoneOffset()` returns: minutes to ADD to local
 * time to get UTC, so Manila (UTC+8) reports -480.
 */
export function clockFromOffset(offsetMinutes) {
    const offset = Number(offsetMinutes);
    const usable = Number.isFinite(offset) && Math.abs(offset) <= 16 * 60;
    const now = new Date(Date.now() - (usable ? offset : new Date().getTimezoneOffset()) * 60_000);

    const pad = (n) => String(n).padStart(2, '0');
    return {
        dayIndex: now.getUTCDay(),
        minutes: now.getUTCHours() * 60 + now.getUTCMinutes(),
        date: `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`,
    };
}
