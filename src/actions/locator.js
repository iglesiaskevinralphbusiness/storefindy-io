"use server";
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel } from '@/mongo';
import { serializeForClient } from '@/utils/helpers';
import { isValidObjectId } from 'mongoose';
import { plans } from '@/utils/constant/pricing';
import mongoose from "mongoose";

export async function postCreateLocator(filters, _prev, formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const form = {
        user_id: session.user.id,
        name: formData.get('locator_name').trim(),
        description: formData.get('locator_description'),
        default_language: formData.get('default_language'),
        default_country: formData.get('default_country'),
        default_zoom_level: formData.get('default_zoom_level'),
        search_radius: formData.get('search_radius'),
        maximum_results_shown: formData.get('maximum_results_shown'),
        filters: filters,
        show_search_bar: formData.get('show_search_box') === 'on' ? true : false,
        detect_location: formData.get('detect_location') === 'on' ? true : false,
        show_filters: formData.get('show_filters') === 'on' ? true : false,
        show_radius: formData.get('show_radius') === 'on' ? true : false,
        show_store_list: formData.get('show_store_list') === 'on' ? true : false,
        show_directions: formData.get('show_directions') === 'on' ? true : false,
        show_store_hours: formData.get('show_store_hours') === 'on' ? true : false,
        powered_by_storefindy: formData.get('powered_by_storefindy') === 'on' ? true : false,
    }

    // manual validation
    const errors = {};
    if (form.name === '') {
        errors.locator_name = 'Locator name is required';
    }
    // if any errors, return early
    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }

    // save
    try {
        await LocatorModel.create(form);
        return { status: "success", message: 'Locator created successfully' };
    } catch (error) {
        console.log(error)
        return { status: "fatal", message: "Server error. Please try again." };
    }
}

export async function postEditLocator(locator_id, filters, _prev, formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const form = {
        user_id: session.user.id,
        name: formData.get('locator_name').trim(),
        description: formData.get('locator_description'),
        default_language: formData.get('default_language'),
        default_country: formData.get('default_country'),
        default_zoom_level: formData.get('default_zoom_level'),
        search_radius: formData.get('search_radius'),
        maximum_results_shown: formData.get('maximum_results_shown'),
        filters: filters,
        show_search_bar: formData.get('show_search_box') === 'on' ? true : false,
        detect_location: formData.get('detect_location') === 'on' ? true : false,
        show_filters: formData.get('show_filters') === 'on' ? true : false,
        show_radius: formData.get('show_radius') === 'on' ? true : false,
        show_store_list: formData.get('show_store_list') === 'on' ? true : false,
        show_directions: formData.get('show_directions') === 'on' ? true : false,
        show_store_hours: formData.get('show_store_hours') === 'on' ? true : false,
        powered_by_storefindy: formData.get('powered_by_storefindy') === 'on' ? true : false,
    }

    // manual validation
    const errors = {};
    if (form.name === '') {
        errors.locator_name = 'Locator name is required';
    }
    // if any errors, return early
    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }

    // save
    try {
        await LocatorModel.findByIdAndUpdate(locator_id, form, { new: true });
        return { status: "success", message: 'Locator updated successfully' };
    } catch (error) {
        return { status: "fatal", message: "Server error. Please try again." };
    }
}

export async function getLocators() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    // const locators = await LocatorModel.find({ user_id: session.user.id }).lean();
    const locators = await LocatorModel.aggregate([
        {
            $match: {
                user_id: session.user.id,
            },
        },
        {
            $addFields: {
                locatorId: { $toString: '$_id' },
            }
        },
        {
            $lookup: {
                from: 'locationmodels', // collection name
                localField: 'locatorId',
                foreignField: 'locator_id',
                as: 'locations',
            },
        },
        {
            $addFields: {
                total_locations: { $size: '$locations' },
            },
        },
        {
            $project: {
                locations: 0, // remove the joined array
            },
        },
    ]);
    const inactiveIds = await getLocatorInactiveIds(session.user.id);

    const updatedLocators = locators.map(locator => ({
        ...locator,
        status: inactiveIds.includes(String(locator._id)) ? "inactive" : "active"
    }));


    return serializeForClient(updatedLocators);
}

export async function getLocatorInactiveIds(user_id) {
    await dbConnect();

    const user = await UserModel.findOne({ _id: user_id }).lean();
    if (!user) {
        return [];
    }

    const plan = plans.find(p => p.id === user.plan) || plan[0];
    const skip = plan.max_locator;

    const locators = (await LocatorModel.find({ user_id })
        .sort({ createdAt: 1 }) // oldest -> newest
        .skip(skip)
        .select('_id')
        .lean()
    ).map(({ _id }) => _id.toString());

    return locators;
}

export async function getLocatorById(locator_id) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    // check if location_id is a valid ObjectId
    if (!isValidObjectId(locator_id)) {
        return null;
    }

    await dbConnect();

    const locator = await LocatorModel.findOne({ _id: locator_id, user_id: session.user.id }).lean();
    if (!locator) {
        return null;
    }

    // user of the locator
    const user = await UserModel.findOne({ _id: locator.user_id }).lean();
    if (!user) {
        return null;
    }

    // inactive ids - set inactive locators that are beyond the plan's limit
    const inactiveIds = await getLocatorInactiveIds(session.user.id);
    return serializeForClient({
        ...locator,
        user_plan: user.plan,
        status: inactiveIds.includes(String(locator._id)) ? 'inactive' : 'active',
    });
}

export async function getAvailableCountriesBasedOnLocations(locator_id) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    // check if location_id is a valid ObjectId
    if (!isValidObjectId(locator_id)) {
        return null;
    }

    await dbConnect();

    const countries = await LocationModel.distinct('country', { locator_id })
    return serializeForClient(countries);
}

export async function postDeleteLocator(locator_id) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    await LocatorModel.findByIdAndDelete(locator_id);
    await LocationModel.deleteMany({ locator_id });
    return { status: "success", message: 'Locator deleted successfully' };
}

export async function functionSaveCustomizeLocator(locator_id, settings, features) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    // check if locator_id is a valid ObjectId
    if (!isValidObjectId(locator_id)) {
        return { status: "error", message: 'Invalid locator ID' };
    }

    await dbConnect();

    // check if locator is owned by the user
    const locator = await LocatorModel.findOne({ _id: locator_id, user_id: session.user.id });
    if (!locator) {
        return { status: "error", message: 'You are not authorized to update this locator' };
    }

    // update locator
    const { focused_zoom, ...restFeatures } = features;
    await LocatorModel.findByIdAndUpdate(locator_id, { settings, focused_zoom, ...restFeatures }, { new: true });

    // return the updated locator
    return { status: "success", message: 'Locator settings and features updated successfully' };
}

export async function getAnalyticsData({ range = '30', locator = 'all' } = {}) {
    const locatorId = locator;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    // user plan
    const user = await UserModel.findOne({ _id: session.user.id }).lean();
    if (!user) {
        return null;
    }
    const plan = plans.find(p => p.id === user.plan) || plan[0];

    if (plan.id === 'free') {
        return null;
    }


    // Query
    // - `query` targets LocatorModel (matched by its own `_id`).
    // - `locations_query` targets LocationModel (locations reference their
    //   parent locator via the `locator_id` string field, not `_id`).
    // Both are scoped to the signed-in user.
    const query = { user_id: session.user.id }
    const locations_query = { user_id: session.user.id }
    console.log(locatorId, 'locatorId');
    if (locatorId !== 'all') {
        query._id = new mongoose.Types.ObjectId(locatorId);
        locations_query.locator_id = locatorId;
    }

    // Date range filter (based on the `range` prop = number of days).
    // e.g. range === '30' -> last 30 days of `views` records.
    // Special case: range === '1' ("Today") means from the start of the
    // current day (midnight UTC) rather than the last 24 hours.
    const days = parseInt(range, 10) || 30;
    const startDate = new Date();
    if (days === 1) {
        startDate.setUTCHours(0, 0, 0, 0);
    } else {
        startDate.setDate(startDate.getDate() - days);
    }

    // Previous equal-length window ([prevStartDate, startDate)), used to compute
    // the "vs last period" trend shown on the stat cards.
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // Matches a single unwound `views` element within the range.
    // (Each `views` sub-document has a `createdAt` from `timestamps: true`.)
    const viewsDateMatch = {
        $match: { "views.createdAt": { $gte: startDate } },
    };

    // Trims a document's `views` array down to the range before summing.
    const filterViewsInRange = {
        $addFields: {
            views: {
                $filter: {
                    input: "$views",
                    as: "v",
                    cond: { $gte: ["$$v.createdAt", startDate] },
                },
            },
        },
    };


    // view data
    const [views_over_time] = await LocatorModel.aggregate([
        {
            $match: query
        },
        {
            $unwind: "$views",
        },
        viewsDateMatch,
        {
            $sort: {
                "views.date_id": 1,
            },
        },
        {
            $group: {
                _id: null,
                views_labels: {
                    $push: {
                        $dateToString: {
                            format: "%b %d",
                            date: {
                                $dateFromString: {
                                    dateString: "$views.date_id",
                                },
                            },
                            timezone: "UTC",
                        },
                    },
                },
                views_data: {
                    $push: "$views.view_count",
                },
            },
        },
        {
            $project: {
                _id: 0,
                views_labels: 1,
                views_data: 1,
            },
        },
    ]);

    // Device Breakdown
    const [devices] = await LocatorModel.aggregate([
        {
            $match: query
        },
        {
            $unwind: {
                path: "$views",
                preserveNullAndEmptyArrays: true,
            },
        },
        viewsDateMatch,
        {
            $group: {
                _id: null,
                mobile: {
                    $sum: {
                        $ifNull: ["$views.mobile_count", 0],
                    },
                },
                desktop: {
                    $sum: {
                        $ifNull: ["$views.desktop_count", 0],
                    },
                },
                tablet: {
                    $sum: {
                        $ifNull: ["$views.tablet_count", 0],
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                total: {
                    $add: ["$mobile", "$desktop", "$tablet"],
                },
                mobile: 1,
                desktop: 1,
                tablet: 1,
            },
        },
        {
            $project: {
                devices: [
                    {
                        name: "Mobile",
                        pct: {
                            $cond: [
                                { $eq: ["$total", 0] },
                                0,
                                {
                                    $round: [
                                        {
                                            $multiply: [
                                                { $divide: ["$mobile", "$total"] },
                                                100,
                                            ],
                                        },
                                        0,
                                    ],
                                },
                            ],
                        },
                        bg: "#fffbe6",
                        fill: "#ffe54c",
                        color: "#BA7517",
                    },
                    {
                        name: "Desktop",
                        pct: {
                            $cond: [
                                { $eq: ["$total", 0] },
                                0,
                                {
                                    $round: [
                                        {
                                            $multiply: [
                                                { $divide: ["$desktop", "$total"] },
                                                100,
                                            ],
                                        },
                                        0,
                                    ],
                                },
                            ],
                        },
                        bg: "#EBF4FF",
                        fill: "#185FA5",
                        color: "#185FA5",
                    },
                    {
                        name: "Tablet",
                        pct: {
                            $cond: [
                                { $eq: ["$total", 0] },
                                0,
                                {
                                    $round: [
                                        {
                                            $multiply: [
                                                { $divide: ["$tablet", "$total"] },
                                                100,
                                            ],
                                        },
                                        0,
                                    ],
                                },
                            ],
                        },
                        bg: "#EAF3DE",
                        fill: "#639922",
                        color: "#3B6D11",
                    },
                ],
            },
        },
    ]);

    // Top Searched Cities
    const top7Searches = await LocatorModel.aggregate([
        {
            $match: query
        },
        {
            $unwind: "$views",
        },
        viewsDateMatch,
        {
            $unwind: "$views.searches",
        },
        {
            $group: {
                _id: {
                    geo_label: "$views.searches.geo_label",
                },
                count: {
                    $sum: "$views.searches.count",
                },
            },
        },
        {
            $sort: {
                count: -1,
            },
        },
        {
            $limit: 7,
        },
        {
            $group: {
                _id: null,
                maxCount: {
                    $first: "$count",
                },
                searches: {
                    $push: {
                        name: "$_id.geo_label",
                        count: "$count",
                    },
                },
            },
        },
        {
            $unwind: "$searches",
        },
        {
            $project: {
                _id: 0,
                name: "$searches.name",
                count: {
                    $toString: "$searches.count",
                },
                pct: {
                    $cond: [
                        { $eq: ["$maxCount", 0] },
                        0,
                        {
                            $round: [
                                {
                                    $multiply: [
                                        {
                                            $divide: ["$searches.count", "$maxCount"],
                                        },
                                        100,
                                    ],
                                },
                                0,
                            ],
                        },
                    ],
                },
            },
        },
        {
            $sort: {
                pct: -1,
            },
        },
    ]);

    // Exact searches
    const topExactSearches = await LocatorModel.aggregate([
        {
            $match: query
        },
        {
            $unwind: "$views",
        },
        viewsDateMatch,
        {
            $unwind: "$views.exact_search",
        },
        {
            $group: {
                _id: "$views.exact_search.exact_search",
                count: {
                    $sum: "$views.exact_search.count",
                },
            },
        },
        {
            $sort: {
                count: -1,
                _id: 1,
            },
        },
        {
            $limit: 12,
        },
        {
            $project: {
                _id: 0,
                term: "$_id",
                count: 1,
            },
        },
    ]);

    // Geographic Search Clusters
    const geoClusters = await LocatorModel.aggregate([
        {
            $match: query,
        },
        {
            $unwind: "$views",
        },
        viewsDateMatch,
        {
            $unwind: "$views.searches",
        },
        {
            $group: {
                _id: "$views.searches.geo_label",
                name: {
                    $first: "$views.searches.geo_label",
                },
                lat: {
                    $first: "$views.searches.lat",
                },
                lng: {
                    $first: "$views.searches.lng",
                },
                count: {
                    $sum: "$views.searches.count",
                },
            },
        },
        {
            $sort: {
                count: -1,
                name: 1,
            },
        },
        {
            $project: {
                _id: 0,
                name: 1,
                lat: 1,
                lng: 1,
                count: 1,
                title: {
                    $concat: [
                        "$name",
                        " · ",
                        {
                            $toString: "$count",
                        },
                        " searches",
                    ],
                },
            },
        },
    ]);

    // Search Activity Heatmap
    const heatmap = await LocatorModel.aggregate([
        {
            $match: query,
        },
        {
            $unwind: "$views",
        },
        viewsDateMatch,
        {
            $addFields: {
                day: {
                    $isoDayOfWeek: {
                        $dateFromString: {
                            dateString: "$views.date_id",
                        },
                    },
                },
            },
        },
        {
            $group: {
                _id: "$day",

                "12a": { $sum: "$views.12a" },
                "1a": { $sum: "$views.1a" },
                "2a": { $sum: "$views.2a" },
                "3a": { $sum: "$views.3a" },
                "4a": { $sum: "$views.4a" },
                "5a": { $sum: "$views.5a" },
                "6a": { $sum: "$views.6a" },
                "7a": { $sum: "$views.7a" },
                "8a": { $sum: "$views.8a" },
                "9a": { $sum: "$views.9a" },
                "10a": { $sum: "$views.10a" },
                "11a": { $sum: "$views.11a" },

                "12p": { $sum: "$views.12p" },
                "1p": { $sum: "$views.1p" },
                "2p": { $sum: "$views.2p" },
                "3p": { $sum: "$views.3p" },
                "4p": { $sum: "$views.4p" },
                "5p": { $sum: "$views.5p" },
                "6p": { $sum: "$views.6p" },
                "7p": { $sum: "$views.7p" },
                "8p": { $sum: "$views.8p" },
                "9p": { $sum: "$views.9p" },
                "10p": { $sum: "$views.10p" },
                "11p": { $sum: "$views.11p" },
            },
        },
        {
            $sort: {
                _id: 1,
            },
        },
    ]);
    const HEAT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const HEAT_HOURS = [
        "12a",
        "2a",
        "4a",
        "6a",
        "8a",
        "10a",
        "12p",
        "2p",
        "4p",
        "6p",
        "8p",
        "10p",
    ];
    const map = new Map(
        heatmap.map(item => [item._id, item])
    );
    const HEAT_DATA = [];
    for (let day = 1; day <= 7; day++) {
        const row = map.get(day) || {};

        HEAT_DATA.push([
            (row["12a"] || 0) + (row["1a"] || 0),
            (row["2a"] || 0) + (row["3a"] || 0),
            (row["4a"] || 0) + (row["5a"] || 0),
            (row["6a"] || 0) + (row["7a"] || 0),
            (row["8a"] || 0) + (row["9a"] || 0),
            (row["10a"] || 0) + (row["11a"] || 0),
            (row["12p"] || 0) + (row["1p"] || 0),
            (row["2p"] || 0) + (row["3p"] || 0),
            (row["4p"] || 0) + (row["5p"] || 0),
            (row["6p"] || 0) + (row["7p"] || 0),
            (row["8p"] || 0) + (row["9p"] || 0),
            (row["10p"] || 0) + (row["11p"] || 0),
        ]);
    }

    // Peak Hours
    const peakHours = await LocatorModel.aggregate([
        {
            $match: query,
        },
        {
            $unwind: "$views",
        },
        viewsDateMatch,
        {
            $group: {
                _id: null,

                "12a": { $sum: "$views.12a" },
                "1a": { $sum: "$views.1a" },
                "2a": { $sum: "$views.2a" },
                "3a": { $sum: "$views.3a" },
                "4a": { $sum: "$views.4a" },
                "5a": { $sum: "$views.5a" },
                "6a": { $sum: "$views.6a" },
                "7a": { $sum: "$views.7a" },
                "8a": { $sum: "$views.8a" },
                "9a": { $sum: "$views.9a" },
                "10a": { $sum: "$views.10a" },
                "11a": { $sum: "$views.11a" },

                "12p": { $sum: "$views.12p" },
                "1p": { $sum: "$views.1p" },
                "2p": { $sum: "$views.2p" },
                "3p": { $sum: "$views.3p" },
                "4p": { $sum: "$views.4p" },
                "5p": { $sum: "$views.5p" },
                "6p": { $sum: "$views.6p" },
                "7p": { $sum: "$views.7p" },
                "8p": { $sum: "$views.8p" },
                "9p": { $sum: "$views.9p" },
                "10p": { $sum: "$views.10p" },
                "11p": { $sum: "$views.11p" },
            },
        },
    ]);
    const row = peakHours[0] || {};
    const PEAK_DATA = [
        row["12a"] || 0,
        row["1a"] || 0,
        row["2a"] || 0,
        row["3a"] || 0,
        row["4a"] || 0,
        row["5a"] || 0,
        row["6a"] || 0,
        row["7a"] || 0,
        row["8a"] || 0,
        row["9a"] || 0,
        row["10a"] || 0,
        row["11a"] || 0,
        row["12p"] || 0,
        row["1p"] || 0,
        row["2p"] || 0,
        row["3p"] || 0,
        row["4p"] || 0,
        row["5p"] || 0,
        row["6p"] || 0,
        row["7p"] || 0,
        row["8p"] || 0,
        row["9p"] || 0,
        row["10p"] || 0,
        row["11p"] || 0,
    ];

    // Most Viewed Locations
    const locations = await LocationModel.aggregate([
        {
            $match: locations_query,
        },
        filterViewsInRange,
        {
            $addFields: {
                totalViews: {
                    $sum: "$views.view_count",
                },
            },
        },
        {
            $sort: {
                totalViews: -1,
            },
        },
        {
            $limit: 7,
        },
    ]);

    // Calculate percentages based on the highest viewed location
    const maxViews = locations.length ? locations[0].totalViews : 0;
    const TOP_LOCATIONS = locations.map((location) => ({
        name: location.name,
        pct: maxViews
            ? Math.round((location.totalViews / maxViews) * 100)
            : 0,
        count: location.totalViews.toLocaleString(),
    }));

    // Click-through Rate by Store
    const CTR_ROWS = await LocationModel.aggregate([
        {
            $match: locations_query,
        },
        filterViewsInRange,
        {
            $project: {
                name: 1,
                totalViews: {
                    $sum: "$views.view_count",
                },
                totalClicks: {
                    $sum: "$views.click_count",
                },
            },
        },
        {
            $addFields: {
                ctr: {
                    $cond: [
                        { $eq: ["$totalViews", 0] },
                        0,
                        {
                            $multiply: [
                                {
                                    $divide: ["$totalClicks", "$totalViews"],
                                },
                                100,
                            ],
                        },
                    ],
                },
            },
        },
        {
            $sort: {
                ctr: -1,
            },
        },
        {
            $limit: 7,
        },
    ]);

    const result_click = CTR_ROWS.map((location) => {
        const rate = Math.round(location.ctr);

        let level = "lo";

        if (rate >= 60) {
            level = "hi";
        } else if (rate >= 40) {
            level = "md";
        }

        return {
            name: location.name,
            views: location.totalClicks.toLocaleString(), // using click_count as requested
            rate: `${rate}%`,
            level,
        };
    });


    // Statistics
    // ── Stat cards (top summary) ──────────────────────────────────────
    // Widget Views  -> LocatorModel:  sum of views.view_count
    // Total Searches -> LocatorModel: sum of counts in views.searches
    // (both computed for the current window and the previous one for the trend)
    const [locatorStats] = await LocatorModel.aggregate([
        { $match: query },
        { $unwind: "$views" },
        {
            $facet: {
                widget_views_current: [
                    { $match: { "views.createdAt": { $gte: startDate } } },
                    { $group: { _id: null, total: { $sum: "$views.view_count" } } },
                ],
                widget_views_previous: [
                    { $match: { "views.createdAt": { $gte: prevStartDate, $lt: startDate } } },
                    { $group: { _id: null, total: { $sum: "$views.view_count" } } },
                ],
                total_searches_current: [
                    { $match: { "views.createdAt": { $gte: startDate } } },
                    { $unwind: "$views.searches" },
                    { $group: { _id: null, total: { $sum: "$views.searches.count" } } },
                ],
                total_searches_previous: [
                    { $match: { "views.createdAt": { $gte: prevStartDate, $lt: startDate } } },
                    { $unwind: "$views.searches" },
                    { $group: { _id: null, total: { $sum: "$views.searches.count" } } },
                ],
            },
        },
    ]);

    // Location Views    -> LocationModel: sum of views.view_count
    // Avg Click-through -> LocationModel: sum(views.click_count) / sum(views.view_count)
    const [locationStats] = await LocationModel.aggregate([
        { $match: locations_query },
        { $unwind: "$views" },
        {
            $facet: {
                current: [
                    { $match: { "views.createdAt": { $gte: startDate } } },
                    {
                        $group: {
                            _id: null,
                            views: { $sum: "$views.view_count" },
                            clicks: { $sum: "$views.click_count" },
                        },
                    },
                ],
                previous: [
                    { $match: { "views.createdAt": { $gte: prevStartDate, $lt: startDate } } },
                    {
                        $group: {
                            _id: null,
                            views: { $sum: "$views.view_count" },
                            clicks: { $sum: "$views.click_count" },
                        },
                    },
                ],
            },
        },
    ]);

    // Unwrap the $facet buckets (each is an array with 0 or 1 grouped result).
    const facetVal = (arr) => (arr && arr[0]) || {};

    const widgetViewsCur = facetVal(locatorStats?.widget_views_current).total ?? 0;
    const widgetViewsPrev = facetVal(locatorStats?.widget_views_previous).total ?? 0;
    const searchesCur = facetVal(locatorStats?.total_searches_current).total ?? 0;
    const searchesPrev = facetVal(locatorStats?.total_searches_previous).total ?? 0;

    const locCur = facetVal(locationStats?.current);
    const locPrev = facetVal(locationStats?.previous);
    const locationViewsCur = locCur.views ?? 0;
    const locationViewsPrev = locPrev.views ?? 0;
    const ctrCur = locCur.views ? (locCur.clicks / locCur.views) * 100 : 0;
    const ctrPrev = locPrev.views ? (locPrev.clicks / locPrev.views) * 100 : 0;

    // Percent change vs previous period -> { trend, up } for the stat cards.
    const trendOf = (cur, prev) => {
        const change = prev ? ((cur - prev) / prev) * 100 : (cur ? 100 : 0);
        const rounded = Math.round(change);
        return {
            trend: `${rounded >= 0 ? "+" : ""}${rounded}% vs last period`,
            up: rounded >= 0,
        };
    };

    const statistics = {
        widget_views: {
            label: "Widget Views",
            value: widgetViewsCur.toLocaleString(),
            ...trendOf(widgetViewsCur, widgetViewsPrev),
        },
        total_searches: {
            label: "Total Searches",
            value: searchesCur.toLocaleString(),
            ...trendOf(searchesCur, searchesPrev),
        },
        location_views: {
            label: "Location Views",
            value: locationViewsCur.toLocaleString(),
            ...trendOf(locationViewsCur, locationViewsPrev),
        },
        avg_click_through: {
            label: "Avg Click-through",
            value: `${ctrCur.toFixed(1)}%`,
            ...trendOf(ctrCur, ctrPrev),
        },
    };

    return {
        statistics,
        views_over_time: views_over_time ?? {
            views_labels: [],
            views_data: [],
        },
        device_breakdown: devices?.devices ?? [
            {
                name: "Mobile",
                pct: 0,
                bg: "#fffbe6",
                fill: "#ffe54c",
                color: "#BA7517",
            },
            {
                name: "Desktop",
                pct: 0,
                bg: "#EBF4FF",
                fill: "#185FA5",
                color: "#185FA5",
            },
            {
                name: "Tablet",
                pct: 0,
                bg: "#EAF3DE",
                fill: "#639922",
                color: "#3B6D11",
            },
        ],
        top_7_cities: top7Searches ?? [],
        top_exact_searches: topExactSearches ?? [],
        geo_clusters: geoClusters ?? [],
        heatmap: {
            heat_hours: HEAT_HOURS,
            heat_data: HEAT_DATA,
        },
        peak_hours: PEAK_DATA,
        most_viewed_locations: TOP_LOCATIONS,
        click_through_rate_by_store: result_click,
    };

}
