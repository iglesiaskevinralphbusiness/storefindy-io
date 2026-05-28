import styles from './Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';

export default function DashboardPage() {
    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>

            </div>
        </div>
    );
}