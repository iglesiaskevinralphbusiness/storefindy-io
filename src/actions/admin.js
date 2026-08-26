"use server";
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel, SubDomainModel } from '@/mongo';
import { getInactiveLocationIds } from '@/lib/locations-query';
import { getInactiveLocatorIds } from '@/lib/locators-query';
import { serializeForClient } from '@/utils/helpers';
import { isValidObjectId } from 'mongoose';
import {
    isConfigured,
    getSubscription,
    listSubscriptions,
    mapSubscription,
    applySubscriptionToUser,
    pickLatestSubscription,
} from '@/lib/lemonsqueezy';
import {
    LIMITS,
    escapeRegex,
    parseObjectIdList,
    pickSortField,
    pickSortOrder,
    toBoundedInt,
    toSearchTerm,
} from '@/lib/api-sanitize';

const SORTABLE_FIELDS = [
    'email',
    'last_login_at',
    'last_synced_at',
    'created_at',
];

export async function getAdminData() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }
    if (session.user.id !== process.env.USER_ID_ADMIN) {
        notFound();
    }

    await dbConnect();

    const user = await UserModel.findById(session.user.id);
    if (!user) {
        redirect('/sign-in');
    }

    return {
        user: serializeForClient(user),
    };
}

export async function getAdminUsers(page=1, rows=10, sort='created_at', order='asc') {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    if (session.user.id !== process.env.USER_ID_ADMIN) {
        notFound();
    }

    const user = await UserModel.findById(session.user.id);
    if (!user) {
        redirect('/sign-in');
    }

    await dbConnect();

    // pagination — clamped so `$limit`/`$skip` can't be handed an arbitrary
    // number of documents to scan or return.
    const currentPage = toBoundedInt(page, { min: 1, max: LIMITS.page, fallback: 1 });
    const currentRows = toBoundedInt(rows, { min: 1, max: LIMITS.pageSize, fallback: 50 });

    const totalCount = await UserModel.countDocuments({});
    const totalPages = Math.ceil(totalCount / currentRows);

    // sort — whitelisted field, see SORTABLE_FIELDS
    const sortField = pickSortField(sort, SORTABLE_FIELDS, 'createdAt');
    const sortOrder = pickSortOrder(order) === 'desc' ? 1 : -1;

    const users = await UserModel.aggregate([
        {
            $addFields: {
                userId: { $toString: '$_id' },
            }
        },
        {
            $lookup: {
                from: 'locatormodels',
                localField: 'userId',
                foreignField: 'user_id',
                as: 'locators',

                pipeline: [
                    {
                        $addFields: {
                            locatorId: { $toString: '$_id' },
                        }
                    },
                    {
                        $lookup: {
                            from: 'locationmodels',
                            localField: 'locatorId',
                            foreignField: 'locator_id',
                            as: 'locations',
                        }
                    },
                    {
                        $addFields: {
                            total_locations: { $size: '$locations' },
                            location_ids: {
                                $map: {
                                    input: '$locations',
                                    as: 'loc',
                                    in: { $toString: '$$loc._id' },
                                },
                            },
                        }
                    },
                    {
                        $project: {
                            locatorId: 0,
                            locations: 0,
                        }
                    }
                ]
            },
        },
        
        {
            $project: { // hide fields
                api_auth_key: 0,
                company: 0,
                country: 0,
                display_name: 0,
                first_name: 0,
                is_welcome_accepted: 0,
                last_name: 0,
                ls_customer_id: 0,
                ls_order_id: 0,
                ls_product_id: 0,
                ls_subscription_id: 0,
                ls_variant_id: 0,
                provider: 0,
                provider_id: 0,
                renewal_date: 0,
                status: 0,
                timezone: 0,
                trial_ends_at: 0,
                userId: 0,
                user_level: 0,
                __v: 0,

                'locators.createdAt': 0,
                'locators.default_country': 0,
                'locators.default_language': 0,
                'locators.default_zoom_level': 0,
                'locators.description': 0,
                'locators.detect_location': 0,
                'locators.dynamic_search': 0,
                'locators.filters': 0,
                'locators.focused_zoom': 0,
                'locators.map_style': 0,
                'locators.form_style': 0,
                'locators.maximum_results_shown': 0,
                'locators.powered_by_storefindy': 0,
                'locators.search_radius': 0,
                'locators.settings': 0,
                'locators.show_directions': 0,
                'locators.show_filters': 0,
                'locators.show_map_pin_number': 0,
                'locators.show_map_radius_indicator': 0,
                'locators.show_radius': 0,
                'locators.show_search_bar': 0,
                'locators.show_store_hours': 0,
                'locators.show_store_list': 0,
                'locators.user_id': 0,
                'locators.views': 0,
                'locators._v': 0,
            }
        },
        { $sort: { [sortField]: sortOrder } },
        { $skip: (currentPage - 1) * currentRows },
        { $limit: currentRows }
    ]);

    const enrichedUsers = await Promise.all(users.map(async (user) => {
        const userId = String(user._id);
        const [inactiveLocatorIds, inactiveLocationIds] = await Promise.all([
            getInactiveLocatorIds(userId),
            getInactiveLocationIds(userId),
        ]);

        user.locators = (user.locators || []).map((locator) => {
            const locatorId = String(locator._id);
            const locationIds = locator.location_ids || [];
            const inactiveLocations = locationIds.filter((id) => inactiveLocationIds.includes(id)).length;
            const activeLocations = locationIds.length - inactiveLocations;
            const { location_ids, ...rest } = locator;

            return {
                ...rest,
                status: inactiveLocatorIds.includes(locatorId) ? 'inactive' : 'active',
                active_locations: activeLocations,
                inactive_locations: inactiveLocations,
                total_locations: locationIds.length,
            };
        });

        return user;
    }));

    return {
        rows: currentRows,
        page: currentPage,
        pages: totalPages === 0 ? 1 : totalPages,
        items: serializeForClient(enrichedUsers),
        session_user_id: session.user.id,
        admin_user_id: process.env.USER_ID_ADMIN,
    };
}

export async function syncAdminUserPlan(userId) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    if (session.user.id !== process.env.USER_ID_ADMIN) {
        notFound();
    }

    if (!isConfigured()) {
        return { status: 'error', message: 'Lemon Squeezy is not configured yet.' };
    }

    if (!isValidObjectId(userId)) {
        return { status: 'error', message: 'Invalid user ID.' };
    }

    await dbConnect();

    const user = await UserModel.findById(userId);
    if (!user) {
        return { status: 'error', message: 'User not found.' };
    }

    try {
        let resource = null;

        if (user.ls_subscription_id) {
            resource = await getSubscription(user.ls_subscription_id);
        }

        if (!resource && user.email) {
            const subs = await listSubscriptions({ email: user.email });
            resource = pickLatestSubscription(subs);
        }

        if (!resource) {
            user.last_synced_at = new Date().toISOString();
            await user.save();

            return {
                status: 'pending',
                message: 'No subscription found on Lemon Squeezy yet.',
                plan: user.plan,
                last_synced_at: user.last_synced_at,
            };
        }

        applySubscriptionToUser(user, mapSubscription(resource));
        user.last_synced_at = new Date().toISOString();
        await user.save();

        return {
            status: 'success',
            message: 'Account synced',
            plan: user.plan,
            last_synced_at: user.last_synced_at,
        };
    } catch (error) {
        return { status: 'error', message: error.message || 'Sync failed.' };
    }
}