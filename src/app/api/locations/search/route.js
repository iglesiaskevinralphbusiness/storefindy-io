import { NextResponse } from 'next/server';
import mongoose, { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/config/mongo.config';
import { LocationModel } from '@/mongo/LocationsModel';
import { LocatorModel } from '@/mongo/LocatorModel';
import { UserModel } from '@/mongo/UserModel';
import { serializeForClient, getCurrentHourCode } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';

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
    const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '1',
        addressdetails: '1', // request structured address parts (city/state/country)
    });
    if (country) params.set('countrycodes', country);
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?${params.toString()}`,
            { headers: { 'User-Agent': 'StoreFindy-Locator/1.0' } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return null;
        const addr = data[0].address || {};
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            label: data[0].display_name || '',
            // city falls back through town/village/municipality;
            // province falls back through state/region
            city_province:
                addr.city || addr.town || addr.village ||
                addr.municipality || addr.state || addr.region || '',
            country: addr.country || '',
        };
    } catch {
        return null;
    }
}

// Reverse geocode raw coordinates (used by map-drag searches) into an address
// so analytics can record city/province and country.
async function reverseGeocode(lat, lng) {
    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: 'json',
        addressdetails: '1',
    });
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
            { headers: { 'User-Agent': 'StoreFindy-Locator/1.0' } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const addr = data.address || {};
        return {
            label: data.display_name || '',
            city_province:
                addr.city || addr.town || addr.village ||
                addr.municipality || addr.state || addr.region || '',
            country: addr.country || '',
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

    // analytics parameters
    const isDemo = searchParams.get('is_demo') === 'true' || searchParams.get('is_demo') === true ? true : false; // for demo purposes we will not use the analytics
    const isRecordQuery = isDemo ? false : searchParams.get('is_record_query') === 'true' || searchParams.get('is_record_query') === true ? true : false;

    // search parameters
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

    let searches_exact_search = '';
    let searches_geo_label = '';
    let searches_city_provice = '';
    let searches_country = '';
    let searches_lat = 0;
    let searches_lng = 0;

    if (hasCoords) {
        const lat = parseFloat(latParam);
        const lng = parseFloat(lngParam);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return json({ status: 'error', message: 'Invalid coordinates.', locations: [] }, 400);
        }
        center = { lat, lng };
        if(isRecordQuery) {
            const rev = await reverseGeocode(lat, lng);
            searches_exact_search = '';
            searches_city_provice = rev?.city_province || '';
            searches_country = rev?.country || '';
            searches_lat = lat;
            searches_lng = lng;
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
        if(isRecordQuery) {
            searches_exact_search = query;
            searches_city_provice = geo.city_province;
            searches_country = geo.country;
            searches_lat = geo.lat;
            searches_lng = geo.lng;
        }
    }

    searches_geo_label = searches_city_provice && searches_country ? `${searches_city_provice}, ${searches_country}` : '';

    // Base query: only this locator's published locations, optionally narrowed
    // to the selected filter labels.
    const match = { locator_id: locatorId, published: true };
    if (filters.length) {
        match.filters = { $in: filters };
    }
    // Browse-by-country: when the widget loads with a default country but no
    // query and no coordinates (auto-detect off), restrict results to that
    // country's locations. On text/coordinate searches the country only biases
    // geocoding, so it must NOT filter the DB there.
    if (countryParam && !hasCoords && !query) {
        match.country = countryParam;
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


    // ANALYTICS
    const today = new Date().toISOString().split("T")[0];
    const isViewExist = await LocatorModel.findOne({
        _id: locatorId,
        "views.date_id": today,
    });

    // record city/province, country to analytics
    if(searches_geo_label !== '' && isViewExist){
        const isExists = await LocatorModel.findOne({
            _id: locatorId,
            views: {
                $elemMatch: {
                    date_id: today,
                    searches: {
                        $elemMatch: {
                            geo_label: searches_geo_label,
                        },
                    },
                },
            },
        });

        if(!isExists) {
            await LocatorModel.updateOne(
                {
                    _id: locatorId,
                    "views.date_id": today,
                },
                {
                    $push: {
                        "views.$.searches": {
                            geo_label: searches_geo_label,
                            city_province: searches_city_provice,
                            country: searches_country,
                            lat: searches_lat,
                            lng: searches_lng,
                            count: 1
                        }
                    }
                }
            );
        } else {
            await LocatorModel.updateOne(
                {
                    _id: locatorId,
                },
                {
                    $inc: {
                        "views.$[view].searches.$[search].count": 1,
                    },
                },
                {
                    arrayFilters: [
                        { "view.date_id": today },
                        { "search.geo_label": searches_geo_label },
                    ],
                }
            );
        }
    }

    // record exact search to analytics
    if(searches_exact_search !== '' && isViewExist){
        const isExactSearchExists = await LocatorModel.findOne({
            _id: locatorId,
            views: {
                $elemMatch: {
                    date_id: today,
                    exact_search: {
                        $elemMatch: {
                            exact_search: searches_exact_search,
                        },
                    },
                },
            },
        });
        if(!isExactSearchExists){
            await LocatorModel.updateOne(
                {
                    _id: locatorId,
                    "views.date_id": today,
                },
                {
                    $push: {
                        "views.$.exact_search": {
                            exact_search: searches_exact_search,
                            count: 1
                        }
                    }
                }
            );
        } else {
            await LocatorModel.updateOne(
                {
                    _id: locatorId,
                },
                {
                    $inc: {
                        "views.$[view].exact_search.$[search].count": 1,
                    },
                },
                {
                    arrayFilters: [
                        { "view.date_id": today },
                        { "search.exact_search": searches_exact_search },
                    ],
                }
            );
        }
    }

    // record peak hours to analytics
    if(isRecordQuery && isViewExist){
        const hourCode = getCurrentHourCode();
        await LocatorModel.updateOne(
            {
                _id: locatorId,
                "views.date_id": today,
            },
            {
                $inc: {
                    [`views.$.${hourCode}`]: 1,
                },
            }
        );
    }

    // locations count viewed   in results
    if(isRecordQuery && activeResults.length > 0){
        const resultsIds = activeResults.map(result => result._id.toString());
        // Convert string IDs to ObjectIds if your _id is ObjectId
        const locationIds = resultsIds.map((id) => new mongoose.Types.ObjectId(id));

        // step 1. Increment existing view_count
        await LocationModel.updateMany(
            {
                _id: { $in: locationIds },
                "views.date_id": today,
            },
            {
                $inc: {
                    "views.$.view_count": 1,
                },
            }
        );

        // step 2: Add today's record if it doesn't exist
        await LocationModel.updateMany(
            {
                _id: { $in: locationIds },
                views: {
                    $not: {
                        $elemMatch: {
                            date_id: today,
                        },
                    },
                },
            },
            {
                $push: {
                    views: {
                        date_id: today,
                        click_count: 0,
                        view_count: 1,
                    },
                },
            }
        );
    }


    return json({
        status: 'success',
        center,
        label,
        radius,
        count: results.length,
        locations: serializeForClient(activeResults),
    });
}
