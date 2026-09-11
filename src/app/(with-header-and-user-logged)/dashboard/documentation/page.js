import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from 'react-icons/ri';
import { TbBook, TbRocket, TbSparkles, TbLifebuoy, TbBug, TbMail } from 'react-icons/tb';
import { DOC_SECTIONS } from '@/lib/documentation-content';
import { DocSection, DocIcon } from '@/components/Dashboard/Documentation';

// Storefindy user documentation. The copy itself lives in
// src/lib/documentation-content.js so the page and the documentation assistant
// read the same words — see the comment at the top of that file. This stays a
// server component: the content is static and the in-page anchor links
// (#section-id) work without any JS.
export const metadata = {
    title: 'Documentation | Store Findy',
    description: 'Step-by-step guides to help you set up, customize, and embed your Store Findy store locator on any website.',
};

export default function DocumentationPage() {
    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Documentation</h1>
                    <p>Dashboard <RiArrowRightLine /> Documentation</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.documentation}>

                        {/* HERO */}
                        <div className={styles.docHero}>
                            <div className={styles.docHeroIcon}>
                                <TbBook />
                            </div>
                            <h2>Storefindy Documentation</h2>
                            <p>
                                Everything you need to build, customize, and embed a beautiful store
                                locator on your website. Follow the guides below to go from an empty
                                dashboard to a live, searchable map of all your locations.
                            </p>
                            <div className={styles.docHeroMeta}>
                                <span><TbRocket /> Quick start in 5 steps</span>
                                <span><TbSparkles /> No code required</span>
                            </div>
                        </div>

                        {/* TABLE OF CONTENTS */}
                        <div className={styles.docToc}>
                            <div className={styles.docTocTitle}>On this page</div>
                            <div className={styles.docTocGrid}>
                                {DOC_SECTIONS.map((section) => (
                                    <a key={section.id} href={`#${section.id}`}>
                                        <DocIcon name={section.icon} />
                                        <span>{section.tocLabel}</span>
                                        <span className={styles.docTocNum}>{section.num}</span>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {DOC_SECTIONS.map((section) => (
                            <DocSection key={section.id} section={section} styles={styles} />
                        ))}

                        {/* SUPPORT FOOTER */}
                        <div className={styles.docSupport}>
                            <div className={styles.docSupportIcon}><TbLifebuoy /></div>
                            <div className={styles.docSupportInfo}>
                                <div className={styles.docSupportTitle}>Still need a hand?</div>
                                <div className={styles.docSupportDesc}>Our team is happy to help you get your locator live.</div>
                            </div>
                            <div className={styles.docSupportActions}>
                                <a href="/dashboard/help-and-support" className={`${styles.docSupportBtn} ${styles.dark}`}><TbMail /> Contact support</a>
                                <a href="/dashboard/report-bug" className={`${styles.docSupportBtn} ${styles.light}`}><TbBug /> Report a bug</a>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
