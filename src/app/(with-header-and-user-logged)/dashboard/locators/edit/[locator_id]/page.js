import LocatorsCreatePage from '../../create/create-client';
import { getLocatorById } from '@/actions/locator';
import styles from '../../../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import { LuArrowLeft } from 'react-icons/lu';
import LimitReached from '@/components/LimitReached';

export default async function LocatorsEditPage({ params }) {
    const { locator_id } = await params;
    const locator = await getLocatorById(locator_id);
    
    if(!locator) {
        return <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Create Locator</h1>
                    <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> All Locators <RiArrowRightLine /> Create Locator</p>
                </div>
                <div className={styles.body}>
                    <LimitReached
                        msg="Locator not found, it could have been deleted."
                        href="/dashboard/locators"
                        buttonText={<><LuArrowLeft /> Back</>}
                    />
                </div>
            </div>
        </div>
    }

    return <LocatorsCreatePage data={locator} />
}