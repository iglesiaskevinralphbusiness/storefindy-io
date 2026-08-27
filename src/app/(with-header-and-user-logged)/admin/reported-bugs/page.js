import styles from '../Admin.module.scss';
import SidebarAdmin from '@/components/Admin/Sidebar';
import { RiArrowRightLine } from 'react-icons/ri';
import { getAdminBugReports } from '@/actions/admin';
import Pagination from '@/components/Pagination';
import BugReportsTable from '@/components/Admin/BugReports/Table';

export default async function ReportedBugsPage({ searchParams }) {
    const {
        page = 1,
        rows = 50,
        sort = 'created_at',
        order = 'desc',
    } = await searchParams;

    const bugReportsData = await getAdminBugReports(page, rows, sort, order);

    return (
        <div className={styles.admin}>
            <SidebarAdmin />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Bugs Reported</h1>
                    <p>Admin <RiArrowRightLine /> Bugs Reported</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.reportedBugs}>
                        {bugReportsData.open_count > 0 && (
                            <p className={styles.openSummary}>
                                {bugReportsData.open_count} open bug report{bugReportsData.open_count === 1 ? '' : 's'}
                            </p>
                        )}
                        <BugReportsTable
                            data={bugReportsData.items}
                            sort={sort}
                            order={order}
                        />
                    </div>
                </div>
                <Pagination page={bugReportsData.page} pages={bugReportsData.pages} />
            </div>
        </div>
    );
}
