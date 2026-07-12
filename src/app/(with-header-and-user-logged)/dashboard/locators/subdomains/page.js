import styles from '../../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import {
    RiArrowRightLine,
    RiGlobalLine,
} from "react-icons/ri";
    import { LuCopy, LuTrash2, LuSettings, LuExternalLink, LuCalendar, LuEye, LuPlus } from "react-icons/lu";
import Button from "@/components/Forms/Button";
import CreateAndIndicator from '@/components/Dashboard/CreateAndIndicator';
import { getLocators } from '@/actions/locator';
import { getSubDomains } from '@/actions/sub-domain';
import SubDomainList from '@/components/Dashboard/SubDomainList';



export default async function LocatorsSubdomainsPage() {
    const locators = await getLocators();
    const subDomains = await getSubDomains();
    console.log(subDomains);

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
                            buttonHref="/dashboard/locators/subdomains/create"
                            used="2 of 3 used"
                        />
                        <SubDomainList locators={locators} data={subDomains} />

                    </div>
                </div>
            </div>
        </div>
    );
}