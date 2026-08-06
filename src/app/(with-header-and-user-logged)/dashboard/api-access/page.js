'use server';
import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import ApiAccessClient from './api-access-client';
import { getProfile } from '@/actions/profile';
import { getBillingStatus } from '@/actions/billing';

export async function generateMetadata() {
    return {
        title: 'API Access | Store Findy',
        description: 'Manage your Storefindy REST API key and browse the available endpoints.',
    };
}

export default async function APIAccessPage() {
    const billingStatus = await getBillingStatus();

    const profile = await getProfile();

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>API Access</h1>
                    <p>Dashboard <RiArrowRightLine /> Account <RiArrowRightLine /> API Access</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.apiAccess}>
                        <ApiAccessClient
                            plan={billingStatus.id}
                            api_auth_key={profile.api_auth_key}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}