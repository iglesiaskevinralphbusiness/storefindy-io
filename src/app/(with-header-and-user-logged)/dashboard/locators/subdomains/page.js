import styles from '../../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine, } from "react-icons/ri";
import { LuPlus } from "react-icons/lu";
import CreateAndIndicator from '@/components/Dashboard/CreateAndIndicator';
import { getLocators } from '@/actions/locator';
import { getSubDomains } from '@/actions/sub-domain';
import SubDomainList from '@/components/Dashboard/SubDomainList';
import Pagination from '@/components/Pagination';
import Information from '@/components/Information';

export default async function LocatorsSubdomainsPage({ searchParams }) {
    const { page, rows, sort, order } = await searchParams;
    const locators = await getLocators();
    const subDomains = await getSubDomains(page, rows, sort, order);

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
                        <Information type="information" message={<>Custom subdomains let your customers access your store locator at a branded URL like <strong>yourbusiness.storefindy.com</strong> — no embed code needed. You can also add a custom header and footer to match your brand.</>} />
                        <CreateAndIndicator 
                            buttonIcon={<LuPlus />}
                            buttonValue="Create Subdomain"
                            buttonHref="/dashboard/locators/subdomains/create"
                            used="2 of 3 used"
                        />
                        <SubDomainList locators={locators} data={subDomains.items} />
                        <Pagination page={subDomains.page} pages={subDomains.pages} />
                    </div>
                </div>
            </div>
        </div>
    );
}