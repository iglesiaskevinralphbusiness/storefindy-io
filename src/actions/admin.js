"use server";
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel, SubDomainModel, SupportTicketModel, BugReportModel } from '@/mongo';
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

const SUPPORT_TICKET_SORTABLE_FIELDS = [
    'reference',
    'email',
    'topic',
    'status',
    'created_at',
];

const BUG_REPORT_SORTABLE_FIELDS = [
    'reference',
    'email',
    'subject',
    'severity',
    'status',
    'created_at',
];

const BUG_REPORT_STATUSES = ['open', 'fixed'];

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

export async function getAdminHelpAndSupportMessages(page = 1, rows = 50, sort = 'created_at', order = 'desc') {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    if (session.user.id !== process.env.USER_ID_ADMIN) {
        notFound();
    }

    await dbConnect();

    const currentPage = toBoundedInt(page, { min: 1, max: LIMITS.page, fallback: 1 });
    const currentRows = toBoundedInt(rows, { min: 1, max: LIMITS.pageSize, fallback: 50 });

    const totalCount = await SupportTicketModel.countDocuments({});
    const totalPages = Math.ceil(totalCount / currentRows);

    const rawSortField = pickSortField(sort, SUPPORT_TICKET_SORTABLE_FIELDS, 'created_at');
    const sortFieldMap = {
        created_at: 'createdAt',
        reference: 'reference',
        email: 'email',
        topic: 'topic',
        status: 'status',
    };
    const sortField = sortFieldMap[rawSortField] || 'createdAt';
    const sortOrder = pickSortOrder(order) === 'desc' ? -1 : 1;

    const tickets = await SupportTicketModel
        .find({})
        .sort({ [sortField]: sortOrder })
        .skip((currentPage - 1) * currentRows)
        .limit(currentRows)
        .lean();

    const items = tickets.map((ticket) => ({
        _id: String(ticket._id),
        user_id: ticket.user_id || '',
        email: ticket.email || '',
        reference: ticket.reference || '',
        topic: ticket.topic || '',
        message: ticket.message || '',
        plan: ticket.plan || '',
        page_url: ticket.page_url || '',
        status: ticket.status || 'open',
        created_at: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : '',
        updated_at: ticket.updatedAt ? new Date(ticket.updatedAt).toISOString() : '',
    }));

    return {
        rows: currentRows,
        page: currentPage,
        pages: totalPages === 0 ? 1 : totalPages,
        items: serializeForClient(items),
        unread_count: await SupportTicketModel.countDocuments({ status: 'open' }),
    };
}

export async function markSupportTicketAsRead(ticketId) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    if (session.user.id !== process.env.USER_ID_ADMIN) {
        notFound();
    }

    if (!isValidObjectId(ticketId)) {
        return { status: 'error', message: 'Invalid ticket ID.' };
    }

    await dbConnect();

    const ticket = await SupportTicketModel.findById(ticketId);
    if (!ticket) {
        return { status: 'error', message: 'Message not found.' };
    }

    if (ticket.status === 'read') {
        return { status: 'success', message: 'Already read.' };
    }

    ticket.status = 'read';
    await ticket.save();

    return { status: 'success', message: 'Marked as read.' };
}

export async function deleteSupportTicket(ticketId) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    if (session.user.id !== process.env.USER_ID_ADMIN) {
        notFound();
    }

    if (!isValidObjectId(ticketId)) {
        return { status: 'error', message: 'Invalid ticket ID.' };
    }

    await dbConnect();

    const ticket = await SupportTicketModel.findByIdAndDelete(ticketId);
    if (!ticket) {
        return { status: 'error', message: 'Message not found.' };
    }

    return { status: 'success', message: 'Message deleted.' };
}

function mapBugReportItem(bug, { includeScreenshots = false } = {}) {
    const systemInfo = bug.system_info || {};
    const item = {
        _id: String(bug._id),
        user_id: bug.user_id || '',
        email: bug.email || '',
        reference: bug.reference || '',
        subject: bug.subject || '',
        severity: bug.severity || 'medium',
        affected_feature: bug.affected_feature || '',
        frequency: bug.frequency || '',
        description: bug.description || '',
        expected_behavior: bug.expected_behavior || '',
        steps: bug.steps || [],
        system_info: {
            browser: systemInfo.browser || '',
            os: systemInfo.os || '',
            screen_resolution: systemInfo.screen_resolution || '',
            user_agent: systemInfo.user_agent || '',
            plan: systemInfo.plan || '',
            app_version: systemInfo.app_version || '',
        },
        status: bug.status || 'open',
        created_at: bug.createdAt ? new Date(bug.createdAt).toISOString() : '',
        updated_at: bug.updatedAt ? new Date(bug.updatedAt).toISOString() : '',
    };

    if (includeScreenshots) {
        item.screenshots = bug.screenshots || [];
    }

    return item;
}

export async function getAdminBugReports(page = 1, rows = 50, sort = 'created_at', order = 'desc') {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    if (session.user.id !== process.env.USER_ID_ADMIN) {
        notFound();
    }

    await dbConnect();

    const currentPage = toBoundedInt(page, { min: 1, max: LIMITS.page, fallback: 1 });
    const currentRows = toBoundedInt(rows, { min: 1, max: LIMITS.pageSize, fallback: 50 });

    const totalCount = await BugReportModel.countDocuments({});
    const totalPages = Math.ceil(totalCount / currentRows);

    const rawSortField = pickSortField(sort, BUG_REPORT_SORTABLE_FIELDS, 'created_at');
    const sortFieldMap = {
        created_at: 'createdAt',
        reference: 'reference',
        email: 'email',
        subject: 'subject',
        severity: 'severity',
        status: 'status',
    };
    const sortField = sortFieldMap[rawSortField] || 'createdAt';
    const sortOrder = pickSortOrder(order) === 'desc' ? -1 : 1;

    const bugs = await BugReportModel
        .find({})
        .select('-screenshots')
        .sort({ [sortField]: sortOrder })
        .skip((currentPage - 1) * currentRows)
        .limit(currentRows)
        .lean();

    const items = bugs.map((bug) => mapBugReportItem(bug));

    return {
        rows: currentRows,
        page: currentPage,
        pages: totalPages === 0 ? 1 : totalPages,
        items: serializeForClient(items),
        open_count: await BugReportModel.countDocuments({ status: 'open' }),
    };
}

export async function getAdminBugReport(bugId) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    if (session.user.id !== process.env.USER_ID_ADMIN) {
        notFound();
    }

    if (!isValidObjectId(bugId)) {
        return { status: 'error', message: 'Invalid bug report ID.' };
    }

    await dbConnect();

    const bug = await BugReportModel.findById(bugId).lean();
    if (!bug) {
        return { status: 'error', message: 'Bug report not found.' };
    }

    return {
        status: 'success',
        item: serializeForClient(mapBugReportItem(bug, { includeScreenshots: true })),
    };
}

export async function updateBugReportStatus(bugId, status) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    if (session.user.id !== process.env.USER_ID_ADMIN) {
        notFound();
    }

    if (!isValidObjectId(bugId)) {
        return { status: 'error', message: 'Invalid bug report ID.' };
    }

    const nextStatus = (status || '').toString().trim();
    if (!BUG_REPORT_STATUSES.includes(nextStatus)) {
        return { status: 'error', message: 'Invalid status.' };
    }

    await dbConnect();

    try {
        const bug = await BugReportModel.findByIdAndUpdate(
            bugId,
            { $set: { status: nextStatus } },
            { new: true, runValidators: true }
        );

        if (!bug) {
            return { status: 'error', message: 'Bug report not found.' };
        }

        return {
            status: 'success',
            message: nextStatus === 'fixed' ? 'Bug report marked as fixed.' : 'Bug report reopened.',
            bug_status: nextStatus,
        };
    } catch (error) {
        return {
            status: 'error',
            message: error?.message || 'Could not update status.',
        };
    }
}

export async function deleteBugReport(bugId) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    if (session.user.id !== process.env.USER_ID_ADMIN) {
        notFound();
    }

    if (!isValidObjectId(bugId)) {
        return { status: 'error', message: 'Invalid bug report ID.' };
    }

    await dbConnect();

    const bug = await BugReportModel.findByIdAndDelete(bugId);
    if (!bug) {
        return { status: 'error', message: 'Bug report not found.' };
    }

    return { status: 'success', message: 'Bug report deleted.' };
}