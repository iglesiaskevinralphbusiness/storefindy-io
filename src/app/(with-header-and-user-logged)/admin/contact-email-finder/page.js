import styles from '../Admin.module.scss';
import SidebarAdmin from '@/components/Admin/Sidebar';
import { RiArrowRightLine } from 'react-icons/ri';
import { getAdminProspectCustomers } from '@/actions/admin/prospectCustomerActions';
import AnalyzeForm from '@/components/Admin/ContactEmailFinder/AnalyzeForm';
import ProspectsTable from '@/components/Admin/ContactEmailFinder/ProspectsTable';

export default async function ContactEmailFinderPage() {
    const prospectData = await getAdminProspectCustomers();

    return (
        <div className={styles.admin}>
            <SidebarAdmin />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Contact Email Finder</h1>
                    <p>Admin <RiArrowRightLine /> Contact Email Finder</p>
                </div>
                <div className={styles.body}>
                    <AnalyzeForm />
                    {prospectData.pending_count > 0 && (
                        <p className={styles.unreadSummary}>
                            {prospectData.pending_count} pending prospect{prospectData.pending_count === 1 ? '' : 's'}
                        </p>
                    )}
                    <ProspectsTable data={prospectData.items} />
                </div>
            </div>
        </div>
    );
}
