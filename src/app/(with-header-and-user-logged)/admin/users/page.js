import styles from '../Admin.module.scss';
import SidebarAdmin from '@/components/Admin/Sidebar';
import { RiArrowRightLine } from 'react-icons/ri';
import { getAdminUsers } from '@/actions/admin';
import Pagination from '@/components/Pagination';
import UsersTable from '@/components/Admin/Users/Table';

export default async function AdminUsersPage({ searchParams }) {
    const {
        page=1,
        rows=50,
        sort='created_at',
        order='asc'
    } = await searchParams;

    const usersData = await getAdminUsers(page, rows, sort, order);

    return (
        <div className={styles.admin}>
            <SidebarAdmin />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Users</h1>
                    <p>Admin <RiArrowRightLine /> Users</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.home}>
                        <UsersTable data={usersData.items} sort={sort} order={order} />
                    </div>
                </div>
                <Pagination page={usersData.page} pages={usersData.pages} />
            </div>
        </div>
    );
}
