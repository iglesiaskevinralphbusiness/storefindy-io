import LocatorsCreatePage from '../../create/create-client';
import { getLocatorById } from '@/actions/locator';
import styles from '../../../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import Link from 'next/link';
import Button from '@/components/Forms/Button';
import { LuArrowLeft } from 'react-icons/lu';

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
                    <div className="empty">
                        <p>Locator not found, it could have been deleted.</p>
                        <Link href="/dashboard/locators"><Button value="Back" icon={<LuArrowLeft />} primary={true} /></Link>
                    </div>
                </div>
            </div>
        </div>
    }

    return <LocatorsCreatePage data={locator} />
}