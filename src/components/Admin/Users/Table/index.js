'use client';
import styles from './UsersTable.module.scss';
import { LuArrowUpDown, LuUsers } from 'react-icons/lu';
import { mongooseFormatTimeAgo } from '@/utils/helpers';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

function formatRelativeDate(value, label) {
    if (!value) return '—';
    return mongooseFormatTimeAgo(value, value, label);
}

export default function UsersTable({ data = [], sort, order }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleSort = (column) => {
        const params = new URLSearchParams(searchParams);
        params.set('sort', column);
        params.set('order', sort === column && order === 'asc' ? 'desc' : 'asc');
        router.push(`${pathname}?${params.toString()}`);
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
                                                    <span className={styles.email}>{user.email}</span>
                                                </td>
                                                <td rowSpan={locators.length} className={styles.date}>
                                                    {formatRelativeDate(user.last_login_at, 'Logged in')}
                                                </td>
                                                <td rowSpan={locators.length} className={styles.date}>
                                                    {formatRelativeDate(user.last_synced_at, 'Synced')}
                                                </td>
                                                <td rowSpan={locators.length} className={styles.date}>
                                                    {formatRelativeDate(user.created_at, 'Created')}
                                                </td>
                                            </>
                                        )}
                                        <td>
                                            {locator?.name ? (
                                                <span className={styles.locatorPill}>{locator.name}</span>
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
                                            {locator ? (locator.total_locations ?? 0).toLocaleString() : '—'}
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
