'use server';
import styles from '../../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import LocatorsCreatePageClient from './create-client';
import LimitReached from '@/components/LimitReached';
import { getBillingStatus } from '@/actions/billing';

export default async function LocatorsCreatePage() {
    const billingStatus = await getBillingStatus();

    if(billingStatus.locator_is_limit_reached) {
        return (
            <div className={styles.dashboard}>
                <Sidebar />
                <div className={styles.content}>
                    <div className={styles.title}>
                        <h1>Create Locator</h1>
                        <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> All Locators <RiArrowRightLine /> Create Locator</p>
                    </div>
                    <div className={styles.body}>
                        <LimitReached msg="You've reached your limit. To create more locators, please subscribe to Pro or Business." />
                    </div>
                </div>
            </div>
        )
    }

    return <LocatorsCreatePageClient />
}