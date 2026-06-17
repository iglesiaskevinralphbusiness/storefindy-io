import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import BillingPageClient from './billing-client';

export default function BillingPage() {
    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Billing</h1>
                    <p>Dashboard <RiArrowRightLine /> Account <RiArrowRightLine /> Billing</p>
                </div>
                <div className={styles.body}>
                    <BillingPageClient />
                </div>
            </div>
        </div>
    );
}
