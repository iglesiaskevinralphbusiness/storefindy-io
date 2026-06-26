import { NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/config/mongo.config';
import { LocationModel } from '@/mongo/LocationsModel';
import { LocatorModel } from '@/mongo/LocatorModel';
import { UserModel } from '@/mongo/UserModel';
import { serializeForClient } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';
import { getLocationsInactiveIds } from '@/actions/locations';

// This endpoint powers the public store-locator widget, which is embedded on
// third-party sites, so every response carries permissive CORS headers and the
// route does not require an authenticated session.
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const EARTH_RADIUS_MILES = 3958.8;

function json(body, status = 200) {
    return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

// Great-circle distance in miles. The schema stores plain lat/lng numbers (no
// 2dsphere index), so radius filtering is done in-process with Haversine.
function distanceInMiles(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_MILES * 2 * Math.asin(Math.sqrt(a));
}

// Resolve a free-text "city, state, or postal code" query into coordinates via
// the free OpenStreetMap Nominatim service (same provider used elsewhere in the
// app). `country` biases results when the locator is scoped to one country.
async function geocode(query, country) {
    const params = new URLSearchParams({ q: query, format: 'json', limit: '1' });
    if (country) params.set('countrycodes', country);
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?${params.toString()}`,
            { headers: { 'User-Agent': 'StoreFindy-Locator/1.0' } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return null;
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            label: data[0].display_name || '',
        };
    } catch {
        return null;
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);

    const isDemo = searchParams.get('is_demo') === 'true' || searchParams.get('is_demo') === true ? true : false; // for demo purposes we will not use the analytics
    const locatorId = searchParams.get('locator_id') || '';
    const query = (searchParams.get('q') || '').trim();
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusParam = searchParams.get('radius');
    const filtersParam = searchParams.get('filters') || '';
    // Country chosen in the widget's dropdown; biases/restricts geocoding so an
    // ambiguous place name resolves to the intended country.
    const countryParam = (searchParams.get('country') || '').trim().toLowerCase();

    if (!locatorId || !isValidObjectId(locatorId)) {
        return json({ status: 'error', message: 'A valid locator is required.', locations: [] }, 400);
    }

    await dbConnect();

    const locator = await LocatorModel.findById(locatorId).lean();
    if (!locator) {
        return json({ status: 'error', message: 'Locator not found.', locations: [] }, 404);
    }

    // Radius and result count fall back to the locator's configured defaults.
    const radius = Number(radiusParam) > 0 ? Number(radiusParam) : (locator.search_radius || 10);
    const limit = locator.maximum_results_shown > 0 ? locator.maximum_results_shown : 10;

    // Selected filter labels, e.g. ["🏬 Mall", "🏥 Clinic"]. A location matches
    // if it carries ANY of the selected filters (OR semantics).
    const filters = filtersParam
        ? filtersParam.split(',').map((f) => f.trim()).filter(Boolean)
        : [];

    // Establish the search center: explicit coordinates (used by map-drag
    // searches) take precedence; otherwise geocode the free-text query.
    let center = null;
    let label = '';
    const hasCoords = latParam !== null && latParam !== '' && lngParam !== null && lngParam !== '';

    if (hasCoords) {
        const lat = parseFloat(latParam);
        const lng = parseFloat(lngParam);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return json({ status: 'error', message: 'Invalid coordinates.', locations: [] }, 400);
        }
        center = { lat, lng };
        if(!isDemo) {
            console.log('hasCoords-----------------', query);
        }
    } else if (query) {
        const geo = await geocode(query, countryParam || locator.default_country);
        if (!geo) {
            return json({
                status: 'not_found',
                message: `No locations were found using your search criteria [ ${query} ]. Please try another input address to search for locations.`,
                center: null,
                radius,
                locations: [],
            });
        }
        center = { lat: geo.lat, lng: geo.lng };
        label = geo.label; // note will use this geo_label in analytics for locatormodel > searches field
        if(!isDemo) {
            console.log('geo-----------------', geo.label);
        }
    }

    // Base query: only this locator's published locations, optionally narrowed
    // to the selected filter labels.
    const match = { locator_id: locatorId, published: true };
    if (filters.length) {
        match.filters = { $in: filters };
    }

    const docs = await LocationModel.find(match).lean();

    let results = docs;
    if (center) {
        results = docs
            .map((doc) => ({
                ...doc,
                distance: distanceInMiles(center.lat, center.lng, doc.latitude, doc.longitude),
            }))
            .filter((doc) => doc.distance <= radius)
            .sort((a, b) => a.distance - b.distance);
    }
    results = results.slice(0, limit);

    // remove results that are found in the inactive ids starts here
    const user_id = locator.user_id;
    const user = await UserModel.findOne({ _id: user_id }).lean();
    if(!user) {
        return json({ status: 'error', message: 'Locator owner not found.', locations: [] }, 404);
    }
    const plan = plans.find(p => p.id === user.plan) || plan[0];
    const skip = plan.max_location;

    const inactiveIds = plan.id === 'business' ? [] :(await LocationModel.find({ user_id })
        .sort({ createdAt: 1 }) // oldest -> newest
        .skip(skip)
        .select('_id')
        .lean()
    ).map(({ _id }) => _id.toString());

    const activeResults = results.filter(result => !inactiveIds.includes(String(result._id)));

    return json({
        status: 'success',
        center,
        label,
        radius,
        count: results.length,
        locations: serializeForClient(activeResults),
    });
}
