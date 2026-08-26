import styles from './Admin.module.scss';
import SidebarAdmin from '@/components/Admin/Sidebar';
import { getAdminData } from '@/actions/admin';

export default async function AdminPage() {
    const adminData = await getAdminData();
    
    return (
        <div className={styles.admin}>
            <SidebarAdmin />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Admin</h1>
                    <p>Here&apos;s what&apos;s happening with storefindy.</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.home}>


                    </div>
                </div>
            </div>
        </div>
    );
}
