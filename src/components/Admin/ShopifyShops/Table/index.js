'use client';
import styles from './ShopifyShopsTable.module.scss';
import { LuArrowUpDown, LuStore, LuExternalLink, LuCheck } from 'react-icons/lu';
import { mongooseFormatTimeAgo } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatRelativeDate(value, label) {
    if (!value) return '—';
    return mongooseFormatTimeAgo(value, value, label);
}

// Fixed UTC formatting rather than toLocaleDateString(): this table is server
// rendered and then hydrated, and a locale-dependent string differs between the
// two.
function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function getPlanLabel(planId = 'free') {
    const plan = plans.find((p) => p.id === planId);
    return plan?.name ?? planId.charAt(0).toUpperCase() + planId.slice(1);
}

function getPlanClass(planId = 'free') {
    if (planId === 'pro') return styles.pro;
    if (planId === 'business') return styles.business;
    return styles.free;
}

// Subscription state as the Shopify Billing API reports it — only `active` is a
// healthy paid shop, everything else is worth an admin's attention.
function getStatusClass(status = 'active') {
    if (status === 'active') return styles.statusActive;
    if (status === 'pending') return styles.statusPending;
    return styles.statusStopped;
}

// The store's handle, which is what admin.shopify.com is keyed by:
// "my-store.myshopify.com" -> "my-store".
function shopHandle(domain = '') {
    return domain.split('.')[0] || '';
}

export default function ShopifyShopsTable({ data = [], sort, order }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleSort = (column) => {
        const params = new URLSearchParams(searchParams);
        params.set('sort', column);
        params.set('order', sort === column && order === 'desc' ? 'asc' : 'desc');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
                <table>
                    <thead>
                        <tr>
                            <th rowSpan={2} onClick={() => handleSort('shop')}>
                                Shop <LuArrowUpDown />
                            </th>
                            <th rowSpan={2} onClick={() => handleSort('installed')}>
                                Install <LuArrowUpDown />
                            </th>
                            <th rowSpan={2} onClick={() => handleSort('plan')}>
                                Billing <LuArrowUpDown />
                            </th>
                            <th rowSpan={2} onClick={() => handleSort('shopify_plan')}>
                                Shopify Plan <LuArrowUpDown />
                            </th>
                            <th rowSpan={2} className={styles.plainHeader}>
                                Setup
                            </th>
                            <th rowSpan={2} onClick={() => handleSort('created_at')}>
                                Created At <LuArrowUpDown />
                            </th>
                            <th colSpan={3} className={styles.locatorsGroup}>
                                Locators
                            </th>
                        </tr>
                        <tr>
                            <th className={styles.subHeader}>Locator Name</th>
                            <th className={styles.subHeader}>Locator Views</th>
                            <th className={styles.subHeader}>Total Locations</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={9}>
                                    <div className={styles.emptyState}>
                                        <LuStore />
                                        <p>No Shopify shops found.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.flatMap((shop) => {
                                // A shop with no locators still gets one row, so the
                                // install is visible before any setup has happened.
                                const locators = shop.locators?.length ? shop.locators : [null];
                                const handle = shopHandle(shop.shop);
                                const storefront = shop.domain || shop.shop;

                                return locators.map((locator, idx) => (
                                    <tr key={`${shop._id}-${locator?._id ?? 'empty'}-${idx}`}>
                                        {idx === 0 && (
                                            <>
                                                <td rowSpan={locators.length}>
                                                    <div className={styles.shopCell}>
                                                        <div className={styles.shopTop}>
                                                            {/* The *.myshopify.com domain is the shop's only stable
                                                                identifier — see ShopModel.js — so it stands in for the
                                                                email column of the users table. */}
                                                            <a
                                                                className={styles.shop}
                                                                href={`https://${storefront}`}
                                                                target="_blank"
                                                                rel="noreferrer noopener"
                                                                title={`Open ${storefront}`}
                                                            >
                                                                {shop.shop}
                                                                <LuExternalLink />
                                                            </a>
                                                            <span className={`${styles.planBadge} ${getPlanClass(shop.plan)}`}>
                                                                {getPlanLabel(shop.plan)}
                                                            </span>
                                                        </div>
                                                        <div className={styles.shopMeta}>
                                                            {shop.name && <span className={styles.shopName}>{shop.name}</span>}
                                                            {shop.email && <span className={styles.shopEmail}>{shop.email}</span>}
                                                        </div>
                                                        {handle && (
                                                            <a
                                                                className={styles.adminLink}
                                                                href={`https://admin.shopify.com/store/${handle}`}
                                                                target="_blank"
                                                                rel="noreferrer noopener"
                                                            >
                                                                Shopify admin
                                                                <LuExternalLink />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td rowSpan={locators.length} className={styles.date}>
                                                    <div className={styles.stackCell}>
                                                        <span
                                                            className={`${styles.statusBadge} ${shop.installed ? styles.active : styles.inactive}`}
                                                        >
                                                            <span className={styles.badgeDot}></span>
                                                            {shop.installed ? 'Installed' : 'Uninstalled'}
                                                        </span>
                                                        <span>
                                                            {shop.installed
                                                                ? formatRelativeDate(shop.installed_at, 'Installed')
                                                                : formatRelativeDate(shop.uninstalled_at, 'Uninstalled')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td rowSpan={locators.length} className={styles.date}>
                                                    <div className={styles.stackCell}>
                                                        <span className={`${styles.subStatus} ${getStatusClass(shop.status)}`}>
                                                            {shop.status || 'active'}
                                                        </span>
                                                        {shop.subscription_test && (
                                                            <span className={styles.testBadge}>test charge</span>
                                                        )}
                                                        {shop.trial_ends_at ? (
                                                            <span>Trial ends {formatDate(shop.trial_ends_at)}</span>
                                                        ) : shop.current_period_end ? (
                                                            <span>Renews {formatDate(shop.current_period_end)}</span>
                                                        ) : (
                                                            <span className={styles.muted}>
                                                                {shop.plan === 'free' ? 'No charge' : '—'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td rowSpan={locators.length} className={styles.date}>
                                                    <div className={styles.stackCell}>
                                                        {/* The SHOP's own Shopify plan, not our subscription. */}
                                                        <span>{shop.shopify_plan || '—'}</span>
                                                        <span className={styles.muted}>
                                                            {[shop.country_code, shop.currency].filter(Boolean).join(' · ') || '—'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td rowSpan={locators.length}>
                                                    <div
                                                        className={styles.setupCell}
                                                        title={(shop.setup_steps || [])
                                                            .map((step) => `${step.done ? '✓' : '○'} ${step.label}`)
                                                            .join('\n')}
                                                    >
                                                        <span
                                                            className={`${styles.setupCount} ${shop.setup_completed === shop.setup_total ? styles.setupDone : ''}`}
                                                        >
                                                            {shop.setup_completed === shop.setup_total && <LuCheck />}
                                                            {shop.setup_completed}/{shop.setup_total}
                                                        </span>
                                                        <span className={styles.setupDots}>
                                                            {(shop.setup_steps || []).map((step) => (
                                                                <span
                                                                    key={step.key}
                                                                    className={`${styles.setupDot} ${step.done ? styles.setupDotDone : ''}`}
                                                                ></span>
                                                            ))}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td rowSpan={locators.length} className={styles.date}>
                                                    {formatRelativeDate(shop.createdAt, 'Created')}
                                                </td>
                                            </>
                                        )}
                                        <td>
                                            {locator?.name ? (
                                                <div className={styles.locatorCell}>
                                                    {locator.embeded_website_url ? (
                                                        // The page the widget was last seen embedded on, recorded
                                                        // by the widget itself. Merchant-supplied, so it opens in
                                                        // a new tab with the referrer withheld.
                                                        <a
                                                            className={`${styles.locatorPill} ${styles.locatorLink}`}
                                                            href={locator.embeded_website_url}
                                                            target="_blank"
                                                            rel="noreferrer noopener"
                                                            title={locator.embeded_website_url}
                                                        >
                                                            {locator.name}
                                                            <LuExternalLink />
                                                        </a>
                                                    ) : (
                                                        <span className={styles.locatorPill}>{locator.name}</span>
                                                    )}
                                                    <span
                                                        className={`${styles.statusBadge} ${locator.status === 'active' ? styles.active : styles.inactive}`}
                                                        title={locator.status === 'inactive' ? "Beyond the shop's plan locator limit." : undefined}
                                                    >
                                                        <span className={styles.badgeDot}></span>
                                                        {locator.status === 'active' ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className={styles.views}>
                                            {locator && locator.views_count > 0
                                                ? locator.views_count.toLocaleString()
                                                : '—'}
                                        </td>
                                        <td className={styles.views}>
                                            {locator ? (
                                                <div className={styles.locationCounts}>
                                                    <span className={styles.locationTotal}>
                                                        {(locator.total_locations ?? 0).toLocaleString()} total
                                                    </span>
                                                    <span className={styles.locationActive}>
                                                        {(locator.active_locations ?? 0).toLocaleString()} active
                                                    </span>
                                                    <span className={styles.locationInactive}>
                                                        {(locator.inactive_locations ?? 0).toLocaleString()} inactive
                                                    </span>
                                                </div>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                    </tr>
                                ));
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
