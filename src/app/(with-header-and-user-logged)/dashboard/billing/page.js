'use server';
import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import BillingPageClient from './billing-client';
import { getBillingStatus } from '@/actions/billing';

export async function generateMetadata() {
    return {
        title: 'Billing & Plans | Store Findy',
        description: 'View your subscription, manage payment details, and upgrade your plan on Store Findy.',
    };
}

export default async function BillingPage() {
    const billingStatus = await getBillingStatus();

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Billing</h1>
                    <p>Dashboard <RiArrowRightLine /> Account <RiArrowRightLine /> Billing</p>
                </div>
                <div className={styles.body}>
                    <BillingPageClient data={billingStatus} />
                </div>
            </div>
        </div>
    );
}
