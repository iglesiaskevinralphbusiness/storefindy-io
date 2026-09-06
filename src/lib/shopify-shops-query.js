// Read-side query for the Shopify app's shops, used by the /admin/shopify-shops
// screen. It is the Shopify equivalent of the users half of getAdminUsers():
// one row per shop, with the shop's locators and their location counts attached.
//
// Everything here reads the SHOPIFY database (DATABASE_URL_SHOPIFY) through the
// named connection in src/config/mongo-shopify.config.js, never the main site's
// default connection. Collection names are mongoose's pluralised model names in
// the Shopify repo: ShopModel -> shopmodels, LocatorModel -> locatormodels,
// LocationModel -> locationmodels.
import { shopifyDbConnect } from '@/config/mongo-shopify.config';
import { plans } from '@/utils/constant/pricing';
import { serializeForClient } from '@/utils/helpers';
import { LIMITS, pickSortField, pickSortOrder, toBoundedInt } from '@/lib/api-sanitize';

// `sort` ends up as a KEY in `$sort`, where a value-level sanitizer cannot help,
// so it has to come from a whitelist. These are the sortable headers in
// components/Admin/ShopifyShops/Table.
const SORTABLE_FIELDS = [
    'shop',
    'installed',
    'plan',
    'shopify_plan',
    'created_at',
];

// The Shopify app stores its own timestamps with mongoose `timestamps: true`,
// so the column the admin calls "created_at" is `createdAt` on the document.
const SORT_FIELD_MAP = {
    shop: 'shop',
    installed: 'installed',
    plan: 'plan',
    shopify_plan: 'shopify_plan',
    created_at: 'createdAt',
};

// Fields that must never leave the server. The access/refresh tokens are live
// Admin API credentials for someone else's store.
const HIDDEN_FIELDS = {
    access_token: 0,
    refresh_token: 0,
    access_token_expires_at: 0,
    scope: 0,
    __v: 0,
};

function planFor(planId) {
    return plans.find((p) => p.id === planId) || plans[0];
}

function timeValue(value) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * The five onboarding steps of the Shopify app's setup guide, rebuilt from the
 * stored markers. Kept in the same order and with the same conditions as
 * getSetupGuide() in the Shopify repo (src/actions/setup.js) so the admin sees
 * exactly what the merchant sees.
 */
function buildSetupSteps(shop, { locatorCount, locationCount }) {
    const setup = shop.setup || {};

    return [
        { key: 'locator', label: 'Add your first locator', done: locatorCount > 0 },
        {
            key: 'app_embed',
            label: 'Enable the app embed block',
            // Both halves are needed — an embed that is on but points at no
            // locator renders an empty storefront.
            done: Boolean(setup.app_embed_enabled && setup.app_embed_locator_set),
        },
        { key: 'locations', label: 'Add your first locations', done: locationCount > 0 },
        { key: 'customize', label: 'Customize the map', done: Boolean(setup.map_customized) },
        { key: 'storefront', label: 'Preview on the storefront', done: Boolean(setup.storefront_previewed) },
    ];
}

/**
 * Attach the plan-derived active/inactive status to a shop's locators and
 * locations.
 *
 * Mirrors getInactiveLocatorIds/getInactiveLocationIds in the Shopify repo: the
 * oldest rows stay active and anything past the plan's cap is reported inactive.
 * The ordering is done in memory from data the aggregation already returned, so
 * a page of shops costs one query rather than two per shop.
 */
function applyPlanStatus(shop) {
    const plan = planFor(shop.plan);

    // Oldest -> newest, the order the caps are applied in.
    const locators = [...(shop.locators || [])].sort(
        (a, b) => timeValue(a.createdAt) - timeValue(b.createdAt)
    );

    const inactiveLocatorIds = new Set(
        locators.slice(plan.max_locator).map((locator) => String(locator._id))
    );

    // The location cap is per shop, not per locator, so the locations of every
    // locator are ranked together.
    const inactiveLocationIds = new Set(
        locators
            .flatMap((locator) => locator.location_refs || [])
            .sort((a, b) => timeValue(a.created_at) - timeValue(b.created_at))
            .slice(plan.max_location)
            .map((location) => location.id)
    );

    let locationCount = 0;

    const decorated = locators.map((locator) => {
        const refs = locator.location_refs || [];
        const inactive = refs.filter((ref) => inactiveLocationIds.has(ref.id)).length;
        locationCount += refs.length;

        // The per-location ids were only needed to rank them against the cap.
        const rest = { ...locator };
        delete rest.location_refs;

        return {
            ...rest,
            status: inactiveLocatorIds.has(String(locator._id)) ? 'inactive' : 'active',
            total_locations: refs.length,
            active_locations: refs.length - inactive,
            inactive_locations: inactive,
        };
    });

    const steps = buildSetupSteps(shop, {
        locatorCount: decorated.length,
        locationCount,
    });

    return {
        ...shop,
        plan_name: plan.name,
        locators: decorated,
        total_locators: decorated.length,
        total_locations: locationCount,
        setup_steps: steps,
        setup_completed: steps.filter((step) => step.done).length,
        setup_total: steps.length,
    };
}

/**
 * One page of Shopify shops, each with its locators, their view counts, and
 * their active/inactive location counts.
 *
 * @param {object}        options
 * @param {number|string} options.page  1-based page number.
 * @param {number|string} options.rows  Results per page.
 * @param {string}        options.sort  One of SORTABLE_FIELDS.
 * @param {string}        options.order 'asc' | 'desc'.
 */
export async function queryShopifyShops({ page = 1, rows = 50, sort = 'created_at', order = 'desc' } = {}) {
    const conn = await shopifyDbConnect();
    const shopsCollection = conn.db.collection('shopmodels');

    // pagination — clamped so `$limit`/`$skip` can't be handed an arbitrary
    // number of documents to scan or return.
    const currentPage = toBoundedInt(page, { min: 1, max: LIMITS.page, fallback: 1 });
    const currentRows = toBoundedInt(rows, { min: 1, max: LIMITS.pageSize, fallback: 50 });

    const totalCount = await shopsCollection.countDocuments({});
    const totalPages = Math.ceil(totalCount / currentRows);

    // sort — whitelisted field, see SORTABLE_FIELDS
    const sortField = SORT_FIELD_MAP[pickSortField(sort, SORTABLE_FIELDS, 'created_at')] || 'createdAt';
    const sortOrder = pickSortOrder(order, 'desc') === 'desc' ? -1 : 1;

    const shops = await shopsCollection.aggregate([
        {
            // Locators store their owner as a STRING id (`user_id` is a
            // ShopModel._id — see the comment at the top of ShopModel.js), so the
            // shop's ObjectId has to be stringified before it can be joined on.
            $addFields: {
                shopId: { $toString: '$_id' },
            },
        },
        {
            $lookup: {
                from: 'locatormodels',
                localField: 'shopId',
                foreignField: 'user_id',
                as: 'locators',
                pipeline: [
                    {
                        $addFields: {
                            locatorId: { $toString: '$_id' },
                        },
                    },
                    {
                        $lookup: {
                            from: 'locationmodels',
                            localField: 'locatorId',
                            foreignField: 'locator_id',
                            as: 'locations',
                        },
                    },
                    {
                        // Only the id and the creation time of each location are
                        // needed — the cap is applied oldest-first — and a locator
                        // can own thousands of them.
                        $addFields: {
                            location_refs: {
                                $map: {
                                    input: '$locations',
                                    as: 'loc',
                                    in: {
                                        id: { $toString: '$$loc._id' },
                                        created_at: '$$loc.createdAt',
                                    },
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            views_count: 1,
                            embeded_website_url: 1,
                            createdAt: 1,
                            location_refs: 1,
                        },
                    },
                    { $sort: { createdAt: 1 } },
                ],
            },
        },
        { $project: { ...HIDDEN_FIELDS, shopId: 0 } },
        { $sort: { [sortField]: sortOrder } },
        { $skip: (currentPage - 1) * currentRows },
        { $limit: currentRows },
    ]).toArray();

    return {
        rows: currentRows,
        page: currentPage,
        pages: totalPages === 0 ? 1 : totalPages,
        total: totalCount,
        items: serializeForClient(shops.map(applyPlanStatus)),
    };
}
