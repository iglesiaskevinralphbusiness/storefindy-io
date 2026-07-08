import styles from '../../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import {
    RiArrowRightLine,
    RiListUnordered,
    RiGlobalLine,
    RiExternalLinkLine,
    RiRoadMapLine,
    RiCalendarLine,
    RiEyeLine,
    RiSettings3Line,
    RiFileCopyLine,
    RiDeleteBinLine,
} from "react-icons/ri";

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

                        {/* YOUR SUBDOMAINS */}
                        <div className={styles.sdBlock}>
                            <h2 className={styles.sdBlockTitle}>
                                <RiListUnordered /> Your Subdomains
                                <span className={styles.sdUsage}>2 of 3 used</span>
                            </h2>
                            <div className={styles.sdList}>
                                {subdomains.map((sd) => (
                                    <div
                                        key={sd.url}
                                        className={`${styles.sdCard} ${sd.active ? styles.sdCardActive : ''}`}
                                    >
                                        <div className={`${styles.sdCardHeader} ${sd.active ? styles.sdCardHeaderActive : ''}`}>
                                            <div className={`${styles.sdIcon} ${sd.active ? styles.sdIconActive : ''}`}>
                                                <RiGlobalLine />
                                            </div>
                                            <div className={styles.sdInfo}>
                                                <div className={styles.sdUrl}>
                                                    {sd.url}
                                                    {sd.active && <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>}
                                                    <a href="#"><RiExternalLinkLine /> Visit</a>
                                                </div>
                                                <div className={styles.sdMeta}>
                                                    <span><RiRoadMapLine /> {sd.locator}</span>
                                                    <span>·</span>
                                                    <span><RiCalendarLine /> Created {sd.created}</span>
                                                    <span>·</span>
                                                    <span><RiEyeLine /> {sd.views} views</span>
                                                </div>
                                            </div>
                                            <div className={styles.sdActions}>
                                                <button className={`${styles.actBtn} ${styles.actBtnPrimary}`} title="Edit"><RiSettings3Line /></button>
                                                <button className={styles.actBtn} title="Copy URL"><RiFileCopyLine /></button>
                                                <button className={`${styles.actBtn} ${styles.actBtnDanger}`} title="Delete"><RiDeleteBinLine /></button>
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
                                            <button className={styles.btnSaveAssign}>Save</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}