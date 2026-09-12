// The analytics writes behind a public search: where people searched from, what
// they typed, when they did it, and which locations they were shown.
//
// Pulled out of the address-search route so the AI search records the same
// things in the same shapes — two search routes writing two slightly different
// histories would quietly split the dashboard's numbers in half.
//
// Every write is guarded on a view row already existing for today: the view
// counter is what creates the day's bucket, so without one there is nothing to
// attach a search to, and inventing a bucket here would count a search on a day
// the locator was never loaded.

import mongoose from 'mongoose';
import { LocationModel } from '@/mongo/LocationsModel';
import { LocatorModel } from '@/mongo/LocatorModel';
import { getCurrentHourCode } from '@/utils/helpers';

const today = () => new Date().toISOString().split('T')[0];

/** A "city, country" label, or '' when either half is missing. */
export function geoLabelOf(geo) {
    return geo?.city_province && geo?.country ? `${geo.city_province}, ${geo.country}` : '';
}

/**
 * Record one search against the locator's day bucket.
 *
 * @param {object} options
 * @param {string} options.locatorId
 * @param {string} [options.exactSearch] What the visitor typed, verbatim.
 * @param {{city_province: string, country: string, lat: number, lng: number}} [options.geo]
 *   Where the search resolved to, forward- or reverse-geocoded.
 * @param {boolean} [options.recordHour] Whether to bump the peak-hour counter.
 */
export async function recordLocatorSearch({ locatorId, exactSearch = '', geo = null, recordHour = false }) {
    const date = today();
    const hasView = await LocatorModel.findOne({ _id: locatorId, 'views.date_id': date });
    if (!hasView) return;

    const geoLabel = geoLabelOf(geo);

    if (geoLabel) {
        const exists = await LocatorModel.findOne({
            _id: locatorId,
            views: { $elemMatch: { date_id: date, searches: { $elemMatch: { geo_label: geoLabel } } } },
        });

        if (!exists) {
            await LocatorModel.updateOne(
                { _id: locatorId, 'views.date_id': date },
                {
                    $push: {
                        'views.$.searches': {
                            geo_label: geoLabel,
                            city_province: geo.city_province,
                            country: geo.country,
                            lat: geo.lat,
                            lng: geo.lng,
                            count: 1,
                        },
                    },
                }
            );
        } else {
            await LocatorModel.updateOne(
                { _id: locatorId },
                { $inc: { 'views.$[view].searches.$[search].count': 1 } },
                { arrayFilters: [{ 'view.date_id': date }, { 'search.geo_label': geoLabel }] }
            );
        }
    }

    if (exactSearch) {
        const exists = await LocatorModel.findOne({
            _id: locatorId,
            views: { $elemMatch: { date_id: date, exact_search: { $elemMatch: { exact_search: exactSearch } } } },
        });

        if (!exists) {
            await LocatorModel.updateOne(
                { _id: locatorId, 'views.date_id': date },
                { $push: { 'views.$.exact_search': { exact_search: exactSearch, count: 1 } } }
            );
        } else {
            await LocatorModel.updateOne(
                { _id: locatorId },
                { $inc: { 'views.$[view].exact_search.$[search].count': 1 } },
                { arrayFilters: [{ 'view.date_id': date }, { 'search.exact_search': exactSearch }] }
            );
        }
    }

    if (recordHour) {
        await LocatorModel.updateOne(
            { _id: locatorId, 'views.date_id': date },
            { $inc: { [`views.$.${getCurrentHourCode()}`]: 1 } }
        );
    }
}

/** Count one impression against every location that appeared in the results. */
export async function recordLocationViews(ids) {
    if (!ids?.length) return;
    const date = today();
    const locationIds = ids.map((id) => new mongoose.Types.ObjectId(String(id)));

    // Bump the locations that already have today's bucket…
    await LocationModel.updateMany(
        { _id: { $in: locationIds }, 'views.date_id': date },
        { $inc: { 'views.$.view_count': 1 } }
    );

    // …and open one for the locations that don't.
    await LocationModel.updateMany(
        { _id: { $in: locationIds }, views: { $not: { $elemMatch: { date_id: date } } } },
        { $push: { views: { date_id: date, click_count: 0, view_count: 1 } } }
    );
}
