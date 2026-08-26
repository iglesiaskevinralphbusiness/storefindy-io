'use client';
import styles from '@/app/(with-header)/page.module.scss';
import { useState } from 'react';
import { TbPlus } from 'react-icons/tb';
import { faqs } from '@/utils/constant/faqs';
import FadeIn from '@/components/FadeIn';

export default function FaqHome() {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <section className={styles.faq} id="faq">
            <FadeIn>
                <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
                    <div className={styles.sectionLabel}>FAQ</div>
                    <div className={styles.sectionTitle}>Frequently asked questions</div>
                    <div className={styles.sectionSub} style={{ margin: '0 auto' }}>Everything you need to know about Storefindy. Can&apos;t find your answer? Contact our support team.</div>
                </div>
            </FadeIn>
            <div className={styles.faqList}>
                {faqs.map((item, i) => {
                    const isOpen = openFaq === i;
                    return (
                        <FadeIn key={i} delay={i * 50}>
                            <div className={styles.faqItem}>
                                <button
                                    className={styles.faqQ}
                                    onClick={() => setOpenFaq(isOpen ? null : i)}
                                    aria-expanded={isOpen}
                                >
                                    <span className={styles.faqQText}>{item.q}</span>
                                    <TbPlus className={`${styles.faqIcon} ${isOpen ? styles.open : ''}`} aria-hidden="true" />
                                </button>
                                {isOpen && <div className={styles.faqA}>{item.a}</div>}
                            </div>
                        </FadeIn>
                    );
                })}
            </div>
        </section>
    );
}
