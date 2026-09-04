'use client';
import { useState } from 'react';
import { TbPlus } from 'react-icons/tb';
import styles from './ShopifySinglePage.module.scss';

export default function AppFaq({ items }) {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className={styles.faqList}>
            {items.map((item, i) => {
                const isOpen = openFaq === i;
                return (
                    <div className={styles.faqItem} key={i}>
                        <button
                            className={styles.faqQ}
                            onClick={() => setOpenFaq(isOpen ? null : i)}
                            aria-expanded={isOpen}
                        >
                            <span className={styles.faqQText}>{item.q}</span>
                            <TbPlus
                                className={`${styles.faqIcon} ${isOpen ? styles.open : ''}`}
                                aria-hidden="true"
                            />
                        </button>
                        {isOpen && <div className={styles.faqA}>{item.a}</div>}
                    </div>
                );
            })}
        </div>
    );
}
