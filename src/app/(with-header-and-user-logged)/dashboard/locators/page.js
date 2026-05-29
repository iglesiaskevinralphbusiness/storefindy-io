import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import Locators from '@/components/Dashboard/Locators';

export default function LocatorsPage() {
    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>All Locators</h1>
                    <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> All Locators</p>
                </div>
                <div className={styles.body}>
                    <Locators />
                </div>
            </div>
        </div>
    );
}