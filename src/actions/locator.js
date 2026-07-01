"use server";
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel } from '@/mongo';
import { serializeForClient } from '@/utils/helpers';
import { isValidObjectId } from 'mongoose';
import { plans } from '@/utils/constant/pricing';

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

export async function getAnalyticsData({ range = '30', locatorId = 'all' } = {}) {
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
    const query = {}
    if (locatorId !== 'all') {
        query._id = new mongoose.Types.ObjectId(locatorId);
    }



    // view data
    const [views_over_time] = await LocatorModel.aggregate([
        {
            $match: query
        },
        {
            $unwind: "$views",
        },
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

    const topExactSearches = await LocatorModel.aggregate([
        {
            $match: query
        },
        {
            $unwind: "$views",
        },
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

    return {
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
    };

}
