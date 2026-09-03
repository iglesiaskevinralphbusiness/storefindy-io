'use client';
import { useState } from 'react';
import styles from './UsersTable.module.scss';
import { LuArrowUpDown, LuUsers, LuRefreshCw, LuExternalLink } from 'react-icons/lu';
import { mongooseFormatTimeAgo } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';
import { syncAdminUserPlan } from '@/actions/admin';
import { toast } from 'react-toastify';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

function formatRelativeDate(value, label) {
    if (!value) return '—';
    return mongooseFormatTimeAgo(value, value, label);
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

export default function UsersTable({ data = [], sort, order }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [syncingUserId, setSyncingUserId] = useState(null);

    const handleSort = (column) => {
        const params = new URLSearchParams(searchParams);
        params.set('sort', column);
        params.set('order', sort === column && order === 'asc' ? 'desc' : 'asc');
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleSync = async (userId) => {
        if (syncingUserId) return;
        setSyncingUserId(userId);

        try {
            const result = await syncAdminUserPlan(userId);

            if (result.status === 'success') {
                toast.success('Account synced', { description: 'Plan is up to date with Lemon Squeezy.' });
                router.refresh();
            } else if (result.status === 'pending') {
                toast.info('Nothing to sync', { description: 'No subscription found on Lemon Squeezy yet.' });
                router.refresh();
            } else {
                throw new Error(result.message || 'Could not sync this account.');
            }
        } catch (err) {
            toast.error('Could not sync account', { description: err.message });
        } finally {
            setSyncingUserId(null);
        }
    };

    return (
        <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
                <table>
                    <thead>
                        <tr>
                            <th rowSpan={2} onClick={() => handleSort('email')}>
                                Email <LuArrowUpDown />
                            </th>
                            <th rowSpan={2} onClick={() => handleSort('last_login_at')}>
                                Last Login <LuArrowUpDown />
                            </th>
                            <th rowSpan={2} onClick={() => handleSort('last_synced_at')}>
                                Last Synced <LuArrowUpDown />
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
                                <td colSpan={7}>
                                    <div className={styles.emptyState}>
                                        <LuUsers />
                                        <p>No users found.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.flatMap((user) => {
                                const locators = user.locators?.length ? user.locators : [null];

                                return locators.map((locator, idx) => (
                                    <tr key={`${user._id}-${locator?._id ?? 'empty'}-${idx}`}>
                                        {idx === 0 && (
                                            <>
                                                <td rowSpan={locators.length}>
                                                    <div className={styles.emailCell}>
                                                        <span className={styles.email}>{user.email}</span>
                                                        <span className={`${styles.planBadge} ${getPlanClass(user.plan)}`}>
                                                            {getPlanLabel(user.plan)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td rowSpan={locators.length} className={styles.date}>
                                                    {formatRelativeDate(user.last_login_at, 'Logged in')}
                                                </td>
                                                <td rowSpan={locators.length} className={styles.date}>
                                                    <div className={styles.syncCell}>
                                                        <span>{formatRelativeDate(user.last_synced_at, 'Synced')}</span>
                                                        <button
                                                            type="button"
                                                            className={styles.syncBtn}
                                                            onClick={() => handleSync(user._id)}
                                                            disabled={syncingUserId === user._id}
                                                            title="Refresh plan from Lemon Squeezy"
                                                        >
                                                            <LuRefreshCw />
                                                            {syncingUserId === user._id ? 'Syncing…' : 'Sync'}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td rowSpan={locators.length} className={styles.date}>
                                                    {formatRelativeDate(user.created_at, 'Created')}
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
                                                        title={locator.status === 'inactive' ? "Beyond the user's plan locator limit." : undefined}
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
