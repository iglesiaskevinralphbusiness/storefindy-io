'use server';
import { RiArrowRightLine } from "react-icons/ri";
import Sidebar from '@/components/Dashboard/Sidebar';
import styles from '../../Dashboard.module.scss';
import { getBillingStatus } from '@/actions/billing';
import ImportCSVPageClient from './import-csv-client';
import LimitReached from '@/components/LimitReached';

export default async function ImportCSVPage() {
    const billingStatus = await getBillingStatus();
    
    if(billingStatus.location_is_limit_reached){
        return (
            <div className={styles.dashboard}>
                <Sidebar />
                <div className={styles.content}>
                    <div className={styles.title}>
                        <h1>Import CSV</h1>
                        <p>Dashboard <RiArrowRightLine /> Locations <RiArrowRightLine /> All Locations <RiArrowRightLine /> Import CSV</p>
                    </div>
                    <div className={styles.body}>
                        <LimitReached heading="Limit Reached" msg="You've reached your limit. To import more locations, please subscribe to Pro or Business." />
                    </div>
                </div>
            </div>
        );
    }

    return <ImportCSVPageClient />
}
