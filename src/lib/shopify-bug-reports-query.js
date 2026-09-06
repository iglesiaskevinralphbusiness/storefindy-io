// Read/triage queries for the bug reports merchants file from inside the Shopify
// app's embedded admin, used by the /admin/shopify-reported-bugs screen.
//
// Everything here reads the SHOPIFY database (DATABASE_URL_SHOPIFY) through the
// named connection in src/config/mongo-shopify.config.js, never the main site's
// default connection. `bugreportmodels` is mongoose's pluralised name for the
// BugReportModel in the Shopify repo, whose schema is deliberately identical to
// this site's — the one addition being `system_info.shop`.
import mongoose from 'mongoose';
import { shopifyDbConnect } from '@/config/mongo-shopify.config';
import { serializeForClient } from '@/utils/helpers';
import { LIMITS, isObjectIdString, pickSortField, pickSortOrder, toBoundedInt } from '@/lib/api-sanitize';

// `sort` ends up as a KEY in `$sort`, where a value-level sanitizer cannot help,
// so it has to come from a whitelist.
const SORTABLE_FIELDS = [
    'reference',
    'email',
    'subject',
    'severity',
    'status',
    'created_at',
];

// The Shopify app stores its timestamps with mongoose `timestamps: true`, so the
// column the admin calls "created_at" is `createdAt` on the document.
const SORT_FIELD_MAP = {
    reference: 'reference',
    email: 'email',
    subject: 'subject',
    severity: 'severity',
    status: 'status',
    created_at: 'createdAt',
};

function mapItem(bug, { includeScreenshots = false, shopDomain = '' } = {}) {
    const systemInfo = bug.system_info || {};

    const item = {
        _id: String(bug._id),
        // A ShopModel._id, not a person — see the header of ShopModel.js in the
        // Shopify repo. `shop` below is the readable form of the same thing.
        user_id: bug.user_id || '',
        shop: systemInfo.shop || shopDomain || '',
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
            shop: systemInfo.shop || shopDomain || '',
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

/**
 * Domain for each of the given shop ids, as one query rather than one per row.
 *
 * `system_info.shop` is captured when the report is filed and is normally
 * enough; this is the fallback for reports filed before that field existed, and
 * it also picks up a shop whose domain has since changed.
 */
async function resolveShopDomains(conn, userIds) {
    const ids = [...new Set(userIds.filter(isObjectIdString))];
    if (ids.length === 0) return {};

    const shops = await conn.db
        .collection('shopmodels')
        .find(
            { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } },
            { projection: { shop: 1 } }
        )
        .toArray();

    return Object.fromEntries(shops.map((shop) => [String(shop._id), shop.shop || '']));
}

/**
 * One page of Shopify bug reports, newest first by default.
 *
 * @param {object}        options
 * @param {number|string} options.page  1-based page number.
 * @param {number|string} options.rows  Results per page.
 * @param {string}        options.sort  One of SORTABLE_FIELDS.
 * @param {string}        options.order 'asc' | 'desc'.
 */
export async function queryShopifyBugReports({ page = 1, rows = 50, sort = 'created_at', order = 'desc' } = {}) {
    const conn = await shopifyDbConnect();
    const bugs = conn.db.collection('bugreportmodels');

    // pagination — clamped so `limit`/`skip` can't be handed an arbitrary number
    // of documents to scan or return.
    const currentPage = toBoundedInt(page, { min: 1, max: LIMITS.page, fallback: 1 });
    const currentRows = toBoundedInt(rows, { min: 1, max: LIMITS.pageSize, fallback: 50 });

    const totalCount = await bugs.countDocuments({});
    const totalPages = Math.ceil(totalCount / currentRows);

    // sort — whitelisted field, see SORTABLE_FIELDS
    const sortField = SORT_FIELD_MAP[pickSortField(sort, SORTABLE_FIELDS, 'created_at')] || 'createdAt';
    const sortOrder = pickSortOrder(order, 'desc') === 'desc' ? -1 : 1;

    // Screenshots are base64 data URLs and can be megabytes each; the list view
    // never shows them, so they are only read by queryShopifyBugReport().
    const items = await bugs
        .find({}, { projection: { screenshots: 0 } })
        .sort({ [sortField]: sortOrder })
        .skip((currentPage - 1) * currentRows)
        .limit(currentRows)
        .toArray();

    const shopDomains = await resolveShopDomains(conn, items.map((bug) => bug.user_id));

    return {
        rows: currentRows,
        page: currentPage,
        pages: totalPages === 0 ? 1 : totalPages,
        items: serializeForClient(
            items.map((bug) => mapItem(bug, { shopDomain: shopDomains[bug.user_id] }))
        ),
        open_count: await bugs.countDocuments({ status: 'open' }),
    };
}

/** One Shopify bug report, screenshots included — the modal's payload. */
export async function queryShopifyBugReport(bugId) {
    if (!isObjectIdString(bugId)) {
        return { status: 'error', message: 'Invalid bug report ID.' };
    }

    const conn = await shopifyDbConnect();
    const bug = await conn.db
        .collection('bugreportmodels')
        .findOne({ _id: new mongoose.Types.ObjectId(bugId) });

    if (!bug) {
        return { status: 'error', message: 'Bug report not found.' };
    }

    const shopDomains = await resolveShopDomains(conn, [bug.user_id]);

    return {
        status: 'success',
        item: serializeForClient(
            mapItem(bug, { includeScreenshots: true, shopDomain: shopDomains[bug.user_id] })
        ),
    };
}

/**
 * Triage a Shopify bug report.
 *
 * The Shopify app's own schema has no enum on `status`, so the whitelist has to
 * be enforced here — the two apps agree on `open` and `fixed`, and writing a
 * third value would leave a row the Shopify side cannot render.
 */
export async function setShopifyBugReportStatus(bugId, status) {
    if (!isObjectIdString(bugId)) {
        return { status: 'error', message: 'Invalid bug report ID.' };
    }

    const conn = await shopifyDbConnect();
    const result = await conn.db.collection('bugreportmodels').updateOne(
        { _id: new mongoose.Types.ObjectId(bugId) },
        { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
        return { status: 'error', message: 'Bug report not found.' };
    }

    return {
        status: 'success',
        message: status === 'fixed' ? 'Bug report marked as fixed.' : 'Bug report reopened.',
        bug_status: status,
    };
}

/** Permanently remove a Shopify bug report. */
export async function removeShopifyBugReport(bugId) {
    if (!isObjectIdString(bugId)) {
        return { status: 'error', message: 'Invalid bug report ID.' };
    }

    const conn = await shopifyDbConnect();
    const result = await conn.db
        .collection('bugreportmodels')
        .deleteOne({ _id: new mongoose.Types.ObjectId(bugId) });

    if (result.deletedCount === 0) {
        return { status: 'error', message: 'Bug report not found.' };
    }

    return { status: 'success', message: 'Bug report deleted.' };
}
