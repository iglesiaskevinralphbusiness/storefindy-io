import { NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/config/mongo.config';
import { LocationModel } from '@/mongo/LocationsModel';
import { LocatorModel } from '@/mongo/LocatorModel';
import { UserModel } from '@/mongo/UserModel';
import { serializeForClient, getUserPlan } from '@/utils/helpers';
import { kmToMiles, milesToKm } from '@/utils/distance';
import { plans } from '@/utils/constant/pricing';
import { COUNTRIES } from '@/utils/constant/countries';
import { getLocatorLabels } from '@/utils/constant/locator-languages';
import { parseLocatorPrompt } from '@/lib/ai/locator-prompt';
import { applyLocatorIntent } from '@/lib/ai/locator-search';
import { buildRecoverySuggestions, fillTemplate } from '@/lib/ai/locator-suggestions';
import { recordLocatorSearch, recordLocationViews } from '@/lib/locator-analytics';

/*
 * "Search with AI" for the public widget.
 *
 * A SEPARATE ROUTE, NOT A FLAG ON /api/locations/search
 * ----------------------------------------------------
 * The address search answers one question — "what is near this point?" — and
 * every parameter it takes is already resolved (a query to geocode, or a lat/lng
 * and a radius). This one starts from a sentence and has to work out what the
 * conditions even are, which of them emptied the result, and what to suggest
 * instead. Bolting that onto the existing route would have meant two different
 * result shapes and two different empty-state contracts behind one URL; keeping
 * them apart leaves the address search exactly as it was, and lets this one
 * return the extra fields the AI panel needs (`understood`, `suggestions`).
 *
 * WHAT THE "AI" IS
 * ----------------
 * Deterministic interpretation over the merchant's own rows — see the header of
 * lib/ai/locator-prompt.js. Nothing here can produce a location, an address or
 * an opening time that is not already in the database.
 *
 * Embedded on third-party sites, so the same permissive CORS headers and
 * session-free access as the address search.
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
    return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

/**
 * Resolve a place name to a point and the box around it, via the same free
 * OpenStreetMap service the address search uses. Only reached when the words the
 * shopper used match nothing in the merchant's own address fields, so a locator
 * whose cities are spelled the way shoppers spell them never calls out at all.
 */
async function geocodePlace(query, country) {
    const params = new URLSearchParams({ q: query, format: 'json', limit: '1', addressdetails: '1' });
    if (country) params.set('countrycodes', country);
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
            headers: { 'User-Agent': 'StoreFindy-Locator/1.0' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return null;

        const first = data[0];
        const address = first.address || {};
        // [south, north, west, east] as strings.
        const box = (first.boundingbox || []).map(Number);
        return {
            lat: parseFloat(first.lat),
            lng: parseFloat(first.lon),
            label: first.display_name || '',
            bounds: box.length === 4 && box.every(Number.isFinite)
                ? { south: box[0], north: box[1], west: box[2], east: box[3] }
                : null,
            city_province:
                address.city || address.town || address.village ||
                address.municipality || address.state || address.region || '',
            country: address.country || '',
        };
    } catch {
        return null;
    }
}

/**
 * The visitor's own clock, sent by the widget.
 *
 * Opening hours are read at face value against it — a stored 8 AM - 5 PM is
 * 8 AM - 5 PM wherever the page is open — which is the same rule the widget's
 * open/closed badge follows. Without it the server's timezone would answer
 * "open now" for a shopper on the other side of the world. Falls back to the
 * server clock only when the parameters are missing or nonsense.
 */
function readClock(searchParams) {
    const day = Number(searchParams.get('day'));
    const minutes = Number(searchParams.get('minutes'));
    const date = searchParams.get('date') || '';

    const usable =
        Number.isInteger(day) && day >= 0 && day <= 6 &&
        Number.isFinite(minutes) && minutes >= 0 && minutes < 1440 &&
        /^\d{4}-\d{2}-\d{2}$/.test(date);

    if (usable) return { dayIndex: day, minutes, date };

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return {
        dayIndex: now.getDay(),
        minutes: now.getHours() * 60 + now.getMinutes(),
        date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    };
}

/** The reason phrase for whichever condition emptied the result. */
function reasonFor(blocked, intent, labels, values) {
    if (blocked === 'schedule') {
        if (intent.closed) return labels.aiReasonScheduleClosed;
        if (intent.open24) return labels.aiReasonSchedule24;
        if (intent.openNow) return labels.aiReasonScheduleNow;
        return labels.aiReasonSchedule;
    }
    if (blocked === 'distance') return fillTemplate(labels.aiReasonDistance, values);
    if (blocked === 'filters') return fillTemplate(labels.aiReasonFilters, { filters: intent.filters.join(', ') });
    if (blocked === 'place') return fillTemplate(labels.aiReasonPlace, { place: intent.leftover || intent.raw });
    if (blocked === 'name') return fillTemplate(labels.aiReasonName, { name: intent.name });
    return '';
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);

    const isDemo = searchParams.get('is_demo') === 'true';
    const isRecordQuery = isDemo ? false : searchParams.get('is_record_query') === 'true';

    const locatorId = searchParams.get('locator_id') || '';
    const prompt = (searchParams.get('prompt') || '').trim();
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const countryParam = (searchParams.get('country') || '').trim().toLowerCase();

    if (!locatorId || !isValidObjectId(locatorId)) {
        return json({ status: 'error', message: 'A valid locator is required.', locations: [] }, 400);
    }

    await dbConnect();

    const locator = await LocatorModel.findById(locatorId).lean();
    if (!locator) {
        return json({ status: 'error', message: 'Locator not found.', locations: [] }, 404);
    }

    const labels = getLocatorLabels(locator.default_language);
    const distanceUnit = locator.distance_unit === 'km' ? 'km' : 'mi';
    const defaultRadius = locator.search_radius > 0 ? locator.search_radius : 10;
    const limit = locator.maximum_results_shown > 0 ? locator.maximum_results_shown : 10;
    const clock = readClock(searchParams);

    // Everything the widget needs to rebuild its own suggestion chips, and what
    // this route fills its recovery suggestions with.
    const countryLabel = COUNTRIES.find((c) => c.code === String(locator.default_country || '').toLowerCase())?.label || '';
    const suggestionContext = {
        labels,
        filters: locator.filters || [],
        place: countryLabel,
        radius: defaultRadius,
        unit: distanceUnit,
        name: '',
    };

    const empty = (message, blocked = null, extra = {}) => json({
        status: 'empty',
        message,
        suggestions: buildRecoverySuggestions(suggestionContext, blocked),
        try_instead: labels.aiTryInstead,
        center: null,
        radius: defaultRadius,
        distance_unit: distanceUnit,
        count: 0,
        locations: [],
        ...extra,
    });

    if (!prompt) {
        return empty(labels.aiPromptEmpty);
    }

    const intent = parseLocatorPrompt(prompt, { filters: locator.filters || [], distanceUnit });
    if (!intent.hasSignal) {
        return empty(fillTemplate(labels.aiNoResultsReason, { query: prompt, reason: labels.aiReasonUnclear }));
    }

    // "Near me" is the one condition this route cannot answer on its own.
    const hasCoords = latParam !== null && latParam !== '' && lngParam !== null && lngParam !== '';
    const visitor = hasCoords ? { lat: parseFloat(latParam), lng: parseFloat(lngParam) } : null;
    if (intent.nearMe && (!visitor || Number.isNaN(visitor.lat) || Number.isNaN(visitor.lng))) {
        // Machine-readable, so the widget can ask the browser for a position and
        // put the same question again rather than leaving the visitor at a dead
        // end they have to back out of themselves.
        return empty(labels.aiNeedLocation, 'place', { needs_location: true });
    }

    // The locator's published locations, minus the ones the owner's plan has
    // pushed out of its limit — the same gate the address search applies, so a
    // location hidden there can never surface here.
    const docs = await LocationModel.find({ locator_id: locatorId, published: true }).lean();

    const user = await UserModel.findOne({ _id: locator.user_id }).lean();
    if (!user) {
        return json({ status: 'error', message: 'Locator owner not found.', locations: [] }, 404);
    }
    const userPlan = getUserPlan(user._id.toString(), user.plan);
    const plan = plans.find((p) => p.id === userPlan) || plans[0];
    const inactiveIds = (await LocationModel.find({ user_id: locator.user_id })
        .sort({ createdAt: 1 })
        .skip(plan.max_location)
        .select('_id')
        .lean()
    ).map(({ _id }) => _id.toString());

    const locations = docs.filter((doc) => !inactiveIds.includes(String(doc._id)));

    // A radius only applies when the shopper asked for one, or asked for "near
    // me" — an answer about a city is bounded by the city, not by a circle.
    const askedRadius = intent.radius
        ? (intent.radius.unit === 'km' ? kmToMiles(intent.radius.value) : intent.radius.value)
        : null;
    const radiusInUnit = intent.radius
        ? (intent.radius.unit === distanceUnit
            ? intent.radius.value
            : (distanceUnit === 'km' ? milesToKm(intent.radius.value) : kmToMiles(intent.radius.value)))
        : defaultRadius;
    const defaultRadiusMiles = distanceUnit === 'km' ? kmToMiles(defaultRadius) : defaultRadius;
    const radiusMiles = askedRadius ?? defaultRadiusMiles;

    let center = intent.nearMe ? visitor : null;
    let geo = null;

    let outcome = applyLocatorIntent(locations, intent, { clock, center, radiusMiles, bounds: null });

    // Did the sentence say anything beyond the leftover words? That decides what
    // to do when those words turn out to name nothing.
    const hasOtherSignal = intent.hasSchedule || intent.nearMe || intent.filters.length > 0 ||
        !!intent.name || !!intent.radius || intent.wantsAll;

    if (!outcome.results.length && outcome.blocked === 'place' && intent.keywords.length) {
        // The words matched nothing in the merchant's own address fields, so the
        // place may still be real — "near the Eiffel Tower", a district the
        // locator doesn't store. Only here is the geocoder worth a round trip.
        geo = await geocodePlace(intent.leftover || intent.keywords.join(' '), countryParam || locator.default_country);

        if (geo) {
            center = center || { lat: geo.lat, lng: geo.lng };
            outcome = applyLocatorIntent(locations, intent, { clock, center, radiusMiles, bounds: geo.bounds });
        } else if (hasOtherSignal) {
            // Words that match no location AND no place on earth are not a
            // place: they are the grammar this parser doesn't know — a particle,
            // a politeness, a stray verb, which is most likely in the languages
            // that aren't written with spaces. The rest of the sentence WAS
            // understood, so answer that rather than refusing over the residue.
            // A prompt that was ONLY those words falls through to the empty
            // branch below, where it belongs.
            outcome = applyLocatorIntent(
                locations,
                { ...intent, keywords: [], leftoverText: '' },
                { clock, center, radiusMiles, bounds: null }
            );
        }
    }

    const results = outcome.results.slice(0, limit);

    // Where to put the map. A geocoded place wins (it is what the shopper
    // named), then the shopper's own position, then the middle of what was
    // actually found — which is what frames a city-wide answer sensibly.
    let mapCenter = geo ? { lat: geo.lat, lng: geo.lng } : (intent.nearMe ? visitor : null);
    if (!mapCenter && results.length) {
        mapCenter = {
            lat: results.reduce((sum, loc) => sum + loc.latitude, 0) / results.length,
            lng: results.reduce((sum, loc) => sum + loc.longitude, 0) / results.length,
        };
    }

    // A real city from the answer beats the locator's country in the follow-up
    // suggestions: "all locations in Cebu" is a better offer than "in Philippines".
    suggestionContext.place = results[0]?.city || locations[0]?.city || countryLabel;
    suggestionContext.name = results[0]?.name || locations[0]?.name || '';

    if (isRecordQuery) {
        await recordLocatorSearch({
            locatorId,
            exactSearch: prompt,
            geo: geo ? { city_province: geo.city_province, country: geo.country, lat: geo.lat, lng: geo.lng } : null,
            recordHour: true,
        });
    }

    if (!results.length) {
        const reason = reasonFor(outcome.blocked, intent, labels, { radius: radiusInUnit, unit: distanceUnit });
        return empty(
            reason
                ? fillTemplate(labels.aiNoResultsReason, { query: prompt, reason })
                : fillTemplate(labels.aiNoResults, { query: prompt }),
            outcome.blocked,
            { understood: intent }
        );
    }

    if (isRecordQuery) {
        await recordLocationViews(results.map((result) => result._id));
    }

    const withDistance = results.map(({ _distanceMiles, ...location }) => (
        typeof _distanceMiles === 'number'
            ? { ...location, distance: distanceUnit === 'km' ? milesToKm(_distanceMiles) : _distanceMiles }
            : location
    ));

    return json({
        status: 'success',
        center: mapCenter,
        label: geo?.label || '',
        radius: radiusInUnit,
        distance_unit: distanceUnit,
        // Only drawn as a circle when the shopper actually asked for a distance;
        // a city-wide answer has no circle to draw.
        show_radius: !!(intent.nearMe || intent.radius),
        count: withDistance.length,
        message: fillTemplate(
            withDistance.length === 1 ? labels.aiLocationFound : labels.aiLocationsFound,
            { count: withDistance.length }
        ),
        understood: intent,
        suggestions: [],
        locations: serializeForClient(withDistance),
    });
}
