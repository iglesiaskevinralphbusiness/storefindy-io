import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import LocatorList from '@/components/Dashboard/LocatorList';
import { getLocators } from '@/actions/locator';

export const metadata = {
    title: 'My Locators | Store Findy',
    description: 'View and manage all of your store locators in one place with Store Findy.',
};

export default async function LocatorsPage() {
    const locators = await getLocators();

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>All Locators</h1>
                    <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> All Locators</p>
                </div>
                <div className={styles.body}>
                    <LocatorList data={locators} />
                </div>
            </div>
        </div>
    );
}