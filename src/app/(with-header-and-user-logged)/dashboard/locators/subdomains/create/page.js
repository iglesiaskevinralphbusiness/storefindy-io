'use server';
import styles from '../../../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import SubdomainsCreatePageClient from './create-client';
import LimitReached from '@/components/LimitReached';
import { getBillingStatus } from '@/actions/billing';
import { getLocators } from '@/actions/locator';

export default async function SubdomainsCreatePage() {
    const billingStatus = await getBillingStatus();
    if(billingStatus.sub_domain_is_limit_reached) {
        return (
            <div className={styles.dashboard}>
                <Sidebar />
                <div className={styles.content}>
                    <div className={styles.title}>
                        <h1>Create Sub Domain</h1>
                        <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> Custom Sub Domains <RiArrowRightLine /> Create Sub Domain</p>
                    </div>
                    <div className={styles.body}>
                        <LimitReached msg="You've reached your limit. To create more sub domains, please subscribe to Pro or Business." />
                    </div>
                </div>
            </div>
        )
    }

    const locators = await getLocators();
    if(locators.length === 0) {
        return (
            <div className={styles.dashboard}>
                <Sidebar />
                <div className={styles.content}>
                    <div className={styles.title}>
                        <h1>Create Sub Domain</h1>
                        <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> Custom Sub Domains <RiArrowRightLine /> Create Sub Domain</p>
                    </div>
                    <div className={styles.body}>
                        <LimitReached
                            heading="No Locators Found"
                            msg="You need to create at least one locator before you can create a sub domain."
                            href="/dashboard/locators/create"
                            buttonText="Create Locator"
                        />
                    </div>
                </div>
            </div>
        )
    }


    return <SubdomainsCreatePageClient locators={locators}/>
}