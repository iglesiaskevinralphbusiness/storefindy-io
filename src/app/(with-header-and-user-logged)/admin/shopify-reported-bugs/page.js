import styles from '../Admin.module.scss';
import SidebarAdmin from '@/components/Admin/Sidebar';
import { RiArrowRightLine } from 'react-icons/ri';
import {
    getAdminShopifyBugReports,
    getAdminShopifyBugReport,
    updateShopifyBugReportStatus,
    deleteShopifyBugReport,
} from '@/actions/admin';
import Pagination from '@/components/Pagination';
import BugReportsTable from '@/components/Admin/BugReports/Table';

/*
 * Bug reports filed from inside the Shopify app. The sibling of
 * /admin/reported-bugs, and the same table — the Shopify app's BugReportModel is
 * deliberately the same shape as this site's — but the rows come from the
 * Shopify app's own database (DATABASE_URL_SHOPIFY), so the actions that read
 * and triage them are handed to the table rather than imported by it.
 */
export default async function ShopifyReportedBugsPage({ searchParams }) {
    const {
        page = 1,
        rows = 50,
        sort = 'created_at',
        order = 'desc',
    } = await searchParams;

    const bugReportsData = await getAdminShopifyBugReports(page, rows, sort, order);

    return (
        <div className={styles.admin}>
            <SidebarAdmin />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Shopify Bugs Reported</h1>
                    <p>Admin <RiArrowRightLine /> Shopify Bugs Reported</p>
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
                            showShop={true}
                            actions={{
                                getBugReport: getAdminShopifyBugReport,
                                updateStatus: updateShopifyBugReportStatus,
                                removeBugReport: deleteShopifyBugReport,
                            }}
                        />
                    </div>
                </div>
                <Pagination page={bugReportsData.page} pages={bugReportsData.pages} />
            </div>
        </div>
    );
}
