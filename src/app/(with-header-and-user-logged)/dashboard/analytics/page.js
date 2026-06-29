import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";

export default function AnalyticsPage() {

    return <>
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Analytics</h1>
                    <p>Dashboard <RiArrowRightLine /> Analytics</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.analytics}>

                        
                    </div>
                </div>
            </div>
        </div>
        
    </>
}