'use client';

import { useState } from 'react';
import {
    TbGift,
    TbCode,
    TbMap,
    TbPalette,
    TbMapPins,
    TbUpload,
    TbCurrentLocation,
    TbFilter,
    TbDeviceMobile,
    TbShoppingBag,
    TbHeartRateMonitor,
    TbToolsKitchen2,
    TbBuildingBank,
    TbPill,
    TbHanger,
    TbCircleCheck,
    TbCircleX,
    TbStarFilled,
    TbPlus,
} from 'react-icons/tb';
import styles from './page.module.scss';
import { plans } from '@/utils/constant/pricing';

const industries = [
    { icon: TbShoppingBag, label: 'Retail' },
    { icon: TbHeartRateMonitor, label: 'Healthcare' },
    { icon: TbToolsKitchen2, label: 'Food & Beverage' },
    { icon: TbBuildingBank, label: 'Finance' },
    { icon: TbPill, label: 'Pharmacy' },
    { icon: TbHanger, label: 'Fashion' },
];

const features = [
    { icon: TbGift, title: 'Free forever', desc: 'No monthly fees, no credit card, no surprise charges. Our core store locator widget is completely free to use for all businesses.' },
    { icon: TbCode, title: 'One-line embed', desc: "Paste a single script tag into your website and you're live. Works with any website — WordPress, Shopify, Squarespace, or plain HTML." },
    { icon: TbMap, title: 'Beautiful interactive map', desc: 'Powered by OpenStreetMap and Leaflet.js — a fast, modern map experience that looks great on any device, with no Google Maps fees.' },
    { icon: TbPalette, title: 'Fully customizable', desc: 'Match your brand perfectly. Customize colors, fonts, pin styles, map theme, button labels, and more from an easy visual editor.' },
    { icon: TbMapPins, title: 'Multiple locators', desc: 'Create separate locators for different brands, regions, or campaigns — each with its own locations, design, and embed code.' },
    { icon: TbUpload, title: 'Bulk CSV import', desc: 'Have hundreds of locations? Upload a CSV file and all your stores are imported instantly — no manual data entry required.' },
    { icon: TbCurrentLocation, title: 'Auto-detect location', desc: 'Customers click one button and the map instantly shows stores nearest to them, making the find-a-store experience effortless.' },
    { icon: TbFilter, title: 'Search & filter', desc: 'Customers can search by city, zip code, or state, and filter results by category — helping them find exactly the right location fast.' },
    { icon: TbDeviceMobile, title: 'Mobile responsive & WCAG compliant', desc: 'The widget adapts perfectly to any screen size. Mobile users get a full-screen map experience optimized for touch and small screens.' },
];

const steps = [
    { num: '1', title: 'Create your free account', desc: 'Sign up in seconds — no credit card required. Your dashboard is ready immediately.' },
    { num: '2', title: 'Add your store locations', desc: 'Add stores manually on the map or bulk import hundreds of locations from a CSV file.' },
    { num: '3', title: 'Customize the widget', desc: 'Match your brand colors, pick a map style, and configure features from the visual editor.' },
    { num: '4', title: 'Paste the embed code', desc: 'Copy one script tag and paste it into your website. Your store locator is live instantly.' },
];



const testimonials = [
    {
        initials: 'MR',
        text: '"We were paying $45 a month for a store locator that did less than Storefindy. The switch took us 20 minutes and it looks even better on our site."',
        name: 'Maria Reyes',
        role: 'Owner, Bloom Boutique · Manila, PH',
    },
    {
        initials: 'JC',
        text: '"I imported 120 pharmacy locations in one CSV upload. The map was live on our website within an hour. Couldn\'t believe it was free."',
        name: 'James Chen',
        role: 'IT Manager, QuickCare Pharmacy · Singapore',
    },
    {
        initials: 'SL',
        text: '"Finally a store locator that small businesses can actually afford. The customizer is so easy — I matched our brand colors in 5 minutes."',
        name: 'Sofia Lim',
        role: 'Founder, FreshBake Co. · Cebu, PH',
    },
];

const faqs = [
    {
        q: 'Is Storefindy really free forever?',
        a: 'Yes. Our Free plan is genuinely free with no time limit and no credit card required. You can create up to 3 locators with up to 50 locations and embed the widget on any website — completely free, forever. We make money through our Pro and Business plans for users who need advanced features.',
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
        a: "Yes — and it's free where they are not. Stockist starts at $15/month and Storemapper at $25/month. Storefindy offers comparable core features including multiple locators, CSV import, customization, and embedding — all on a free plan. For small businesses and startups, Storefindy is the smart choice to start with.",
    },
];

export default function Home() {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className='wrap'>
            <section className={styles.hero}>
                <h1>Store Locator for Your Website — Beautiful and Fast at the Cheapest Cost</h1>
                <p>Customized to your brand. Live in minutes. No developer, zero complexity — just a store locator that works.</p>
                <div className={styles.buttonBox}>
                    <a href="#" className="buttonBox secondary">See Our Live Demo</a>
                    <a href="#" className="buttonBox">Create Store Locator</a>
                </div>
            </section>

            {/* LOGOS */}
            <div className={styles.logos}>
                <p>Trusted by businesses across every industry</p>
                <div className={styles.logosRow}>
                    {industries.map(({ icon: Icon, label }) => (
                        <div className={styles.logoPill} key={label}>
                            <Icon aria-hidden="true" /> {label}
                        </div>
                    ))}
                </div>
            </div>

            {/* FEATURES */}
            <section className={styles.features} id="features">
                <div style={{ maxWidth: 560 }}>
                    <div className={styles.sectionLabel}>Features</div>
                    <div className={styles.sectionTitle}>Everything you need to help customers find your stores</div>
                    <div className={styles.sectionSub}>Storefindy gives you a powerful, customizable store locator widget — built for small businesses, with zero cost and zero complexity.</div>
                </div>
                <div className={styles.featuresGrid}>
                    {features.map(({ icon: Icon, title, desc }) => (
                        <div className={styles.featureCard} key={title}>
                            <div className={styles.featureIcon}><Icon aria-hidden="true" /></div>
                            <div className={styles.featureTitle}>{title}</div>
                            <div className={styles.featureDesc}>{desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className={styles.howitworks} id="how-it-works">
                <div style={{ textAlign: 'center' }}>
                    <div className={styles.sectionLabel}>How it works</div>
                    <div className={styles.sectionTitle} style={{ marginBottom: 8 }}>Up and running in minutes</div>
                    <div className={styles.sectionSub} style={{ margin: '0 auto' }}>No developer needed. Anyone can set up a Storefindy widget in four simple steps.</div>
                </div>
                <div className={styles.stepsGrid}>
                    {steps.map(({ num, title, desc }) => (
                        <div className={styles.stepCard} key={num}>
                            <div className={styles.stepNum}>{num}</div>
                            <div className={styles.stepTitle}>{title}</div>
                            <div className={styles.stepDesc}>{desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* PRICING */}
            <section className={styles.pricing} id="pricing">
                <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
                    <div className={styles.sectionLabel}>Pricing</div>
                    <div className={styles.sectionTitle}>Simple, honest pricing</div>
                    <div className={styles.sectionSub} style={{ margin: '0 auto' }}>Start free and stay free — or unlock advanced features as your business grows. No hidden fees, ever.</div>
                </div>
                <div className={styles.pricingGrid}>
                    {plans.map((plan) => (
                        <div className={`${styles.pricingCard} ${plan.featured ? styles.featured : ''}`} key={plan.name}>
                            {plan.badge && <div className={styles.pricingBadge}>{plan.badge}</div>}
                            <div className={styles.pricingName}>{plan.name}</div>
                            <div className={styles.pricingPrice}>{plan.price} <span>{plan.period}</span></div>
                            <div className={styles.pricingDesc}>{plan.desc}</div>
                            <div className={styles.pricingDivider}></div>
                            <div className={styles.pricingFeatures}>
                                {plan.features.map((f, i) => (
                                    <div className={`${styles.pricingFeature} ${f.ok ? '' : styles.no}`} key={i}>
                                        {f.ok ? <TbCircleCheck aria-hidden="true" /> : <TbCircleX aria-hidden="true" />} {f.text}
                                    </div>
                                ))}
                            </div>
                            <button className={`${styles.btnPricing} ${styles[plan.ctaClass]}`}>{plan.cta}</button>
                        </div>
                    ))}
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section className={styles.testimonials} id="testimonials">
                <div style={{ textAlign: 'center' }}>
                    <div className={styles.sectionLabel}>Testimonials</div>
                    <div className={styles.sectionTitle}>Businesses love Storefindy</div>
                    <div className={styles.sectionSub} style={{ margin: '0 auto' }}>Real feedback from real store owners who switched from expensive tools to Storefindy.</div>
                </div>
                <div className={styles.testimonialsGrid}>
                    {testimonials.map((t) => (
                        <div className={styles.testimonialCard} key={t.name}>
                            <div className={styles.testimonialStars}>
                                {Array.from({ length: 5 }).map((_, i) => <TbStarFilled key={i} aria-hidden="true" />)}
                            </div>
                            <div className={styles.testimonialText}>{t.text}</div>
                            <div className={styles.testimonialAuthor}>
                                <div className={styles.authorAvatar}>{t.initials}</div>
                                <div>
                                    <div className={styles.authorName}>{t.name}</div>
                                    <div className={styles.authorRole}>{t.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
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

            {/* CTA BANNER */}
            <div className={styles.ctaBanner}>
                <h2>Start finding your customers more stores — free</h2>
                <p>Join hundreds of businesses already using Storefindy to help customers find their nearest store, branch, or outlet.</p>
                <div className={styles.ctaBannerActions}>
                    <button className={styles.btnCtaYellow}>Create your free locator</button>
                    <button className={styles.btnCtaGhost}>View live demo</button>
                </div>
            </div>
        </div>
    );
}
