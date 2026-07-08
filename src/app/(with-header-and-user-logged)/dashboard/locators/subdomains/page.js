import styles from '../../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import {
    RiArrowRightLine,
    RiListUnordered,
    RiGlobalLine,
    RiExternalLinkLine,
    RiRoadMapLine,
    RiSettings3Line,
    RiFileCopyLine,
    RiDeleteBinLine,
} from "react-icons/ri";
    import { LuCopy, LuTrash2, LuSettings, LuExternalLink, LuCalendar, LuEye, LuPlus } from "react-icons/lu";
import Button from "@/components/Forms/Button";
import CreateAndIndicator from '@/components/Dashboard/CreateAndIndicator';

const subdomains = [
    {
        url: 'mybrand.storefindy.com',
        active: true,
        locator: 'Main Store Locator',
        created: 'Jun 1, 2026',
        views: '1,204',
    },
    {
        url: 'branchfinder.storefindy.com',
        active: false,
        locator: 'Branch Finder',
        created: 'Jun 15, 2026',
        views: '342',
    },
];

const locatorOptions = ['Main Store Locator', 'Branch Finder', 'Pop-up Stores', 'Flagship Stores'];

export default async function LocatorsSubdomainsPage() {


    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Custom Subdomains</h1>
                    <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> Custom Subdomains</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.subdomains}>
                        <p className={styles.alert}>Custom subdomains let your customers access your store locator at a branded URL like <strong>yourbusiness.storefindy.com</strong> — no embed code needed. You can also add a custom header and footer to match your brand.</p>

                        <CreateAndIndicator 
                            buttonIcon={<LuPlus />}
                            buttonValue="Create Subdomain"
                        />

                        <div className={styles.sdList}>
                            {subdomains.map((sd) => (
                                <div
                                    key={sd.url}
                                    className={styles.sdCard}
                                >
                                    <div className={styles.sdCardHeader}>
                                        <div className={styles.sdIcon}>
                                            <RiGlobalLine />
                                        </div>
                                        <div className={styles.sdInfo}>
                                            <div className={styles.sdUrl}>
                                                {sd.url}
                                                {sd.active && <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>}
                                                <a href="#"><LuExternalLink /> Visit</a>
                                            </div>
                                            <div className={styles.sdMeta}>
                                                <span><LuExternalLink /> {sd.locator}</span>
                                                <span>·</span>
                                                <span><LuCalendar /> Created {sd.created}</span>
                                                <span>·</span>
                                                <span><LuEye /> {sd.views} visits</span>
                                            </div>
                                        </div>
                                        <div className={styles.sdActions}>
                                            <Button
                                                icon={<LuSettings />}
                                                value=""
                                            />
                                            <Button
                                                icon={<LuCopy />}
                                                value=""
                                            />
                                            <Button
                                                icon={<LuTrash2 />}
                                                value=""
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.sdCardBody}>
                                        <div className={styles.sdLocatorAssign}>
                                            <span className={styles.sdLocatorLabel}>Assigned locator:</span>
                                            <select className={styles.sdLocatorSelect} defaultValue={sd.locator}>
                                                {locatorOptions.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <Button
                                            primary={true}
                                            type="submit"
                                            value="Save"
                                            pending={false}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}