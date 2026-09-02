"use server";
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel, SubDomainModel } from '@/mongo';
import { getLocationsInactiveIds } from '@/actions/locations';
import { serializeForClient, getUserPlan } from '@/utils/helpers';
import { resolveMapLibrarySelection } from '@/utils/constant/mapbox-styles';
import { isValidObjectId } from 'mongoose';
import { plans } from '@/utils/constant/pricing';
import { queryLocators, queryLocatorById, getInactiveLocatorIds } from '@/lib/locators-query';
import { queryAnalyticsData } from '@/lib/analytics-query';
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
        distance_unit: formData.get('distance_unit') || 'mi',
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
        distance_unit: formData.get('distance_unit') || 'mi',
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

    // Same query the REST endpoint GET /api/v1/locators serves.
    return queryLocators(session.user.id);
}

export async function getLocatorInactiveIds(user_id) {
    return getInactiveLocatorIds(user_id);
}

export async function getLocatorById(locator_id) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    // Same query the REST endpoint GET /api/v1/locators/:id serves.
    return queryLocatorById(session.user.id, locator_id);
}

export async function getLocatorByName(locator_name, record_visit=false) {
    await dbConnect();
    const sub_domain = await SubDomainModel.findOne({ name: locator_name }).lean();
    if(!sub_domain) {
        return null;
    }
    const locator = await LocatorModel.findOne({ _id: sub_domain.locator_id }).lean();
    if(!locator) {
        return null;
    }

    if(record_visit){
        await SubDomainModel.findOneAndUpdate({ _id: sub_domain._id }, { $inc: { visits: 1 } }, { new: true });
    }
    
    return {
        sub_domain,
        locator
    };
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
    await SubDomainModel.deleteMany({ locator_id });
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

    // Mapbox is Business-only. The sidebar already hides it from other plans,
    // but that is a client-side gate on a payload this action accepts whole —
    // so the selection is re-resolved here against the owner's real plan before
    // anything is written. A non-Business account can only ever persist the
    // default library on the default style.
    const user = await UserModel.findOne({ _id: session.user.id }).lean();
    const user_plan = user ? getUserPlan(String(user._id), user.plan) : 'free';
    const mapLibrary = resolveMapLibrarySelection(features, user_plan);

    // update locator
    const { focused_zoom, dynamic_search, ...restFeatures } = features;
    await LocatorModel.findByIdAndUpdate(locator_id, {
        settings,
        focused_zoom,
        dynamic_search,
        ...restFeatures,
        map_style: mapLibrary.map_style,
        map_library: mapLibrary.map_library,
        mapbox_style_source: mapLibrary.mapbox_style_source,
        mapbox_style: mapLibrary.mapbox_style,
        mapbox_custom_json: mapLibrary.mapbox_custom_json,
        mapbox_3d: mapLibrary.mapbox_3d,
    }, { new: true });

    // return the updated locator
    return { status: "success", message: 'Locator settings and features updated successfully' };
}

export async function getAnalyticsData({ range = '30', locator = 'all' } = {}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const user = await UserModel.findOne({ _id: session.user.id }).lean();
    if (!user) {
        return null;
    }

    return queryAnalyticsData({
        user_id: session.user.id,
        user_plan: user.plan,
        range,
        locator,
    });
}

export async function getHomeData() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    await dbConnect();

    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) {
        redirect('/sign-in');
    }

    const range = '30';
    const locator = 'all';
    const query = { user_id: session.user.id }
    const locations_query = { user_id: session.user.id }

    const days = parseInt(range, 10) || 30;
    const startDate = new Date();
    if (days === 1) {
        startDate.setUTCHours(0, 0, 0, 0);
    } else {
        startDate.setDate(startDate.getDate() - days);
    }
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const viewsDateMatch = {
        $match: { "views.createdAt": { $gte: startDate } },
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


    // Statistics
    // Widget Views
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
    const facetVal = (arr) => (arr && arr[0]) || {};
    const widgetViewsCur = facetVal(locatorStats?.widget_views_current).total ?? 0;
    const widgetViewsPrev = facetVal(locatorStats?.widget_views_previous).total ?? 0;
    const trendOf = (cur, prev) => {
        const change = prev ? ((cur - prev) / prev) * 100 : (cur ? 100 : 0);
        const rounded = Math.round(change);
        return {
            trend: `${rounded >= 0 ? "+" : ""}${rounded}%`,
            up: rounded >= 0,
        };
    };

    // Total Sub Domain Visits
    const [subDomainStats] = await SubDomainModel.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$visits" } } },
    ]);
    const totalSubDomainVisits = subDomainStats ? subDomainStats.total ?? 0 : 0;

    // Total Active Locators
    const activeLocators = await LocatorModel.countDocuments({ user_id: session.user.id });
    const inactiveLocators = await getLocatorInactiveIds(session.user.id);

    // Total Active Locations
    const activeLocations = await LocationModel.countDocuments({ user_id: session.user.id });
    const inactiveLocations = await getLocationsInactiveIds(session.user.id);

    const statistics = {
        widget_views: {
            label: "Widget Views last 30 days",
            value: widgetViewsCur.toLocaleString(),
            ...trendOf(widgetViewsCur, widgetViewsPrev),
        },
        total_sub_domains_visits: {
            label: "Overall Sub Domain Visits",
            value: totalSubDomainVisits.toLocaleString(),
            up: '',
            trend: '',
        },
        total_active_locators: {
            label: "Locator Active Count",
            value: (activeLocators - inactiveLocators.length).toLocaleString(),
            up: `${inactiveLocators.length} Inactive`,
            trend: 'neu',
        },
        total_active_locations: {
            label: "Locations Active Count",
            value: (activeLocations - inactiveLocations.length).toLocaleString(),
            up: `${inactiveLocations.length} Inactive`,
            trend: 'neu',
        },
    };


    return {
        statistics,
        views_over_time: views_over_time ?? {
            views_labels: [],
            views_data: [],
        },
        is_welcome_accepted: user.is_welcome_accepted ? true : false,
    }
}
