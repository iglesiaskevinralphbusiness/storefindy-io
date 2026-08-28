// Shared analytics aggregation. Kept out of `src/actions/locator.js` (a "use server"
// module) so both the dashboard action `getAnalyticsData()` and the REST route
// `GET /api/v1/analytics` derive their figures from the exact same pipelines.
import mongoose from 'mongoose';
import { dbConnect } from '@/config/mongo.config';
import { LocatorModel, LocationModel } from '@/mongo';
import { plans } from '@/utils/constant/pricing';
import { getUserPlan } from '@/utils/helpers';

/**
 * Analytics payload for one account over a date range.
 *
 * @param {object} options
 * @param {string} options.user_id
 * @param {string} [options.user_plan] Stored plan on the user document.
 * @param {string} [options.range='30'] Days to include, or `1` for today (UTC).
 * @param {string} [options.locator='all'] Locator id, or `all`.
 * @returns {Promise<object|null>} null when the account is on the free plan.
 */
export async function queryAnalyticsData({
    user_id,
    user_plan: storedPlan,
    range = '30',
    locator = 'all',
} = {}) {
    await dbConnect();

    const user_plan = getUserPlan(user_id.toString(), storedPlan);
    const plan = plans.find((p) => p.id === user_plan) || plans[0];
    if (plan.id === 'free') {
        return null;
    }

    const locatorId = locator;
    const query = { user_id: user_id }
    const locations_query = { user_id: user_id }
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
    })).filter(location => location.pct > 0);

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
    }).filter(location => location.views > 0);


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
        plan: plan.id,
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
        top_7_cities: plan.id === 'business' ? top7Searches ?? [] : [],
        top_exact_searches: plan.id === 'business' ? topExactSearches ?? [] : [],
        geo_clusters: plan.id === 'business' ? geoClusters ?? [] : [],
        heatmap: {
            heat_hours: HEAT_HOURS,
            heat_data: plan.id === 'business' ? HEAT_DATA : [
                [0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0,0,0]
            ],
        },
        peak_hours: plan.id === 'business' ? PEAK_DATA : [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        most_viewed_locations: plan.id === 'business' ? TOP_LOCATIONS : [],
        click_through_rate_by_store: plan.id === 'business' ? result_click : [],
    };
}
