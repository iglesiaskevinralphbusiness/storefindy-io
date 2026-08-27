import styles from '../Admin.module.scss';
import SidebarAdmin from '@/components/Admin/Sidebar';
import { RiArrowRightLine } from 'react-icons/ri';
import { getAdminHelpAndSupportMessages } from '@/actions/admin';
import Pagination from '@/components/Pagination';
import SupportMessagesTable from '@/components/Admin/SupportMessages/Table';

export default async function HelpAndSupportMessagesPage({ searchParams }) {
    const {
        page = 1,
        rows = 50,
        sort = 'created_at',
        order = 'desc',
    } = await searchParams;

    const helpSupportData = await getAdminHelpAndSupportMessages(page, rows, sort, order);

    return (
        <div className={styles.admin}>
            <SidebarAdmin />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Help And Support Messages</h1>
                    <p>Admin <RiArrowRightLine /> Help And Support Messages</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.helpAndSupportMessages}>
                        {helpSupportData.unread_count > 0 && (
                            <p className={styles.unreadSummary}>
                                {helpSupportData.unread_count} unread message{helpSupportData.unread_count === 1 ? '' : 's'}
                            </p>
                        )}
                        <SupportMessagesTable
                            data={helpSupportData.items}
                            sort={sort}
                            order={order}
                        />
                    </div>
                </div>
                <Pagination page={helpSupportData.page} pages={helpSupportData.pages} />
            </div>
        </div>
    );
}
