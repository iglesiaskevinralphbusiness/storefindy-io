'use client';
import styles from '@/app/(with-header)/page.module.scss';
import { useState } from 'react';
import { TbPlus } from 'react-icons/tb';

const faqs = [
    {
        q: 'Is Storefindy really free forever?',
        a: 'Yes. Our Free plan is genuinely free with no time limit and no credit card required. It covers stores with 20 locations and below — you can create your locator, add up to 20 locations, and embed the widget on any website completely free, forever. If your store grows beyond 20 locations, our Pro and Business plans unlock higher limits and advanced features.',
    },
    {
        q: 'Do I need a developer to install the widget?',
        a: "No developer needed. You simply copy one script tag from your Storefindy dashboard and paste it into your website's HTML. It works with WordPress, Shopify, Wix, Squarespace, Webflow, or any custom-built website. Our step-by-step install guide walks you through the process in under 5 minutes.",
    },
    {
        q: 'Which map provider does Storefindy use?',
        a: 'Storefindy uses Leaflet.js with OpenStreetMap tiles — an open-source alternative to Google Maps. This means there are no API fees, no usage limits, and no surprise billing as your traffic grows. The map looks great, loads fast, and works reliably worldwide.',
    },
    {
        q: 'Can I use Storefindy if I have hundreds of store locations?',
        a: 'Absolutely. Our CSV import feature lets you upload hundreds or even thousands of store locations in one go. Simply format your data with the required columns (name, city, state, country, latitude, longitude) and import the file. All locations are live on your widget instantly.',
    },
    {
        q: 'Can I customize the widget to match my brand?',
        a: 'Yes. The visual customizer lets you change the primary color, background color, font family, map style (Standard, Dark, Minimal), pin color and style, button labels, and more. Free plan users get basic customization. Pro and Business users get full access to all design settings and can remove the Storefindy branding.',
    },
    {
        q: 'Is Storefindy a good alternative to Stockist or Storemapper?',
        a: "Yes — and it's free where they are not. Stockist starts at $15/month and Storemapper at $25/month. Storefindy offers comparable core features including multiple locators, CSV import, customization, and embedding — free for stores with 20 locations and below. For small businesses and startups, Storefindy is the smart choice to start with.",
    },
];

export default function FaqHome() {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <section className={styles.faq} id="faq">
            <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
                <div className={styles.sectionLabel}>FAQ</div>
                <div className={styles.sectionTitle}>Frequently asked questions</div>
                <div className={styles.sectionSub} style={{ margin: '0 auto' }}>Everything you need to know about Storefindy. Can&apos;t find your answer? Contact our support team.</div>
            </div>
            <div className={styles.faqList}>
                {faqs.map((item, i) => {
                    const isOpen = openFaq === i;
                    return (
                        <div className={styles.faqItem} key={i}>
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
                    );
                })}
            </div>
        </section>
    );
}