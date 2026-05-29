import styles from '../../../Dashboard.module.scss';
import SidebarCustomize from '@/components/Dashboard/SidebarCustomize';
import { RiArrowRightLine } from "react-icons/ri";

export default async function LocatorsCustomizePage({ params }) {
    const { locator_id } = await params;

    return (
        <div className={styles.dashboard}>
            <SidebarCustomize />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Customize Locator</h1>
                    <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> Customize Locator</p>
                </div>
            </div>
        </div>
    );
}