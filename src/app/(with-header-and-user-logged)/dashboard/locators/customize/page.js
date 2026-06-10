import styles from '../../Dashboard.module.scss';
import csv from '../../locations/import-csv/ImportCsv.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import { getLocators } from '@/actions/locator';
import Link from 'next/link';
import Button from '@/components/Forms/Button';
import { LuPlus, LuMap } from 'react-icons/lu';
import { redirect } from 'next/navigation';

export default async function LocatorsCustomizePage() {
    const locators = await getLocators();

    if(locators.length === 1) {
        redirect(`/dashboard/locators/customize/${locators[0]._id}`);
    }
   

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Customize Locator</h1>
                    <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> Customize Locator</p>
                </div>
                <div className={styles.body}>
                {
                    locators === null ? null
                        : locators.length === 0 ? (
                            <div className="empty">
                                <p>You don&apos;t have any locators yet. Please create a locator first.</p>
                                <Link href="/dashboard/locators/create"><Button value="Create Locator" icon={<LuPlus />} primary={true} /></Link>
                            </div>
                        ) : <>
                            <div className={csv.wizard}>
                                <div className={csv.steps} style={{ width: '300px', margin: '0 auto' }}>
                                    <div className={csv.step}>
                                        <div className={`${csv.stepNum} ${csv.active}`}>1</div>
                                        <div className={csv.stepInfo}>
                                            <div className={csv.stepLabel}>Select Locator</div>
                                            <div className={csv.stepSub}>Choose target</div>
                                        </div>
                                    </div>
                                    <div className={csv.step}>
                                        <div className={csv.stepNum}>2</div>
                                        <div className={csv.stepInfo}>
                                            <div className={csv.stepLabel}>Customize</div>
                                            <div className={csv.stepSub}>Pick your design</div>
                                        </div>
                                    </div>
                                </div>

                                <div className={csv.card}>
                                    <div className={csv.cardTitle}>
                                        <LuMap /> Select Target Locator
                                        <span className={csv.badgeInfo}>1 Customize per locator</span>
                                    </div>
                                    <p className={csv.cardDesc}>
                                        Each locator can be customized with a unique design. Choose the locator you want to customize.
                                    </p>
                                    <div className={csv.locatorOptions}>
                                        {locators.map(loc => (
                                            <Link
                                                key={loc._id}
                                                className={csv.locatorOpt}
                                                href={`/dashboard/locators/customize/${loc._id}`}
                                            >
                                                <div className={csv.locatorOptIcon}><LuMap /></div>
                                                <div className={csv.locatorOptName}>{loc.name}</div>
                                                <div className={csv.locatorOptMeta}>{loc.default_country?.toUpperCase() || 'Locator'}</div>
                                            </Link>
                                        ))}
                                    </div>
                                   
                                </div>
                            </div>
                        </>
                    }
                </div>
            </div>
        </div>
    );
}