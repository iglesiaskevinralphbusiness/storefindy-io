import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";

export default function DocumentationPage() {
    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>All Locations</h1>
                    <p>Dashboard <RiArrowRightLine /> Documentation</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.documentation}>

                        
                    </div>
                </div>
            </div>
        </div>
    );
}