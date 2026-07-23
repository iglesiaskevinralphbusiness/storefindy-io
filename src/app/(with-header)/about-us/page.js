import Link from 'next/link';
import {
    TbTargetArrow,
    TbHeartHandshake,
    TbBolt,
    TbCoin,
    TbCode,
    TbWorld,
    TbBuildingStore,
    TbRocket,
} from 'react-icons/tb';
import styles from './AboutUs.module.scss';

export const metadata = {
    title: 'About Us | Storefindy',
    description:
        'Storefindy is on a mission to give every business a beautiful, affordable store locator. Learn about the story, values, and people behind Storefindy.',
};

const stats = [
    { value: '2026', label: 'Founded' },
    { value: '10k+', label: 'Locations mapped' },
    { value: '30+', label: 'Countries served' },
    { value: '$0', label: 'To get started' },
];

const values = [
    {
        icon: TbCoin,
        title: 'Affordable for everyone',
        desc: 'We believe a great store locator should not be locked behind a $45/month paywall. Our core widget is free forever so any business can compete online.',
    },
    {
        icon: TbBolt,
        title: 'Radically simple',
        desc: 'No developers, no complexity. If you can copy and paste, you can launch a Storefindy locator on your website in minutes.',
    },
    {
        icon: TbHeartHandshake,
        title: 'Built on trust',
        desc: 'Honest pricing with no hidden fees, no surprise charges, and no selling of your data. What you see is exactly what you get.',
    },
    {
        icon: TbWorld,
        title: 'Open by default',
        desc: 'We build on open technology like OpenStreetMap and Leaflet.js — no vendor lock-in, no per-view map fees as your traffic grows.',
    },
];

const story = [
    {
        icon: TbBuildingStore,
        title: 'The problem we saw',
        desc: 'Small businesses were paying $15–45 every month just to show customers where their stores are — or worse, using clunky, dated maps that hurt their brand.',
    },
    {
        icon: TbCode,
        title: 'What we built',
        desc: 'A modern, one-line embeddable store locator that looks beautiful on any site, imports hundreds of locations in seconds, and matches your brand perfectly.',
    },
    {
        icon: TbRocket,
        title: 'Where we are going',
        desc: 'To become the go-to store locator for small and growing businesses everywhere — powerful enough for enterprises, simple and affordable enough for a one-person shop.',
    },
];

export default function AboutUs() {
    return (
        <>
            {/* HERO */}
            <section className={styles.hero}>
                <div className="wrap">
                    <div className={styles.label}>About Us</div>
                    <h1 className={styles.title}>
                        Helping every business get found — beautifully and affordably
                    </h1>
                    <p className={styles.subtitle}>
                        Storefindy was born from a simple belief: finding a store shouldn&apos;t be hard for customers,
                        and putting a store locator online shouldn&apos;t be expensive for businesses.
                    </p>
                    <div className={styles.buttonBox}>
                        <a href="https://demo.storefindy.com" className="buttonBox secondary">See Our Live Demo</a>
                        <a href="/dashboard" className="buttonBox">Create Store Locator</a>
                    </div>
                </div>
            </section>

            {/* STATS */}
            <div className={styles.statsBar}>
                <div className="wrap">
                    <div className={styles.statsGrid}>
                        {stats.map((s) => (
                            <div className={styles.statCard} key={s.label}>
                                <div className={styles.statValue}>{s.value}</div>
                                <div className={styles.statLabel}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MISSION */}
            <div className="wrap">
                <section className={styles.mission}>
                    <div className={styles.missionIcon}>
                        <TbTargetArrow aria-hidden="true" />
                    </div>
                    <div className={styles.sectionLabel}>Our mission</div>
                    <div className={styles.missionText}>
                        To give <strong>every business</strong> — from the corner bakery to the growing franchise — a
                        store locator that looks professional, works flawlessly on every device, and costs nothing to
                        start. We&apos;re here to level the playing field.
                    </div>
                </section>
            </div>

            {/* STORY */}
            <section className={styles.story}>
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>Our story</div>
                        <div className={styles.sectionTitle}>From a frustration to a product</div>
                        <div className={styles.sectionSub}>
                            We were tired of watching small businesses overpay for something that should be simple. So
                            we built the store locator we wished existed.
                        </div>
                    </div>
                    <div className={styles.storyGrid}>
                        {story.map(({ icon: Icon, title, desc }) => (
                            <div className={styles.storyCard} key={title}>
                                <div className={styles.storyIcon}>
                                    <Icon aria-hidden="true" />
                                </div>
                                <div className={styles.storyTitle}>{title}</div>
                                <div className={styles.storyDesc}>{desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* VALUES */}
            <div className="wrap">
                <section className={styles.values}>
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>What we stand for</div>
                        <div className={styles.sectionTitle}>Our values</div>
                        <div className={styles.sectionSub}>
                            The principles that guide every decision we make and every feature we build.
                        </div>
                    </div>
                    <div className={styles.valuesGrid}>
                        {values.map(({ icon: Icon, title, desc }) => (
                            <div className={styles.valueCard} key={title}>
                                <div className={styles.valueIcon}>
                                    <Icon aria-hidden="true" />
                                </div>
                                <div>
                                    <div className={styles.valueTitle}>{title}</div>
                                    <div className={styles.valueDesc}>{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* CTA BANNER */}
            <div className="wrap">
                <div className={styles.ctaBanner}>
                    <h2>Ready to help your customers find you?</h2>
                    <p>
                        Join hundreds of businesses already using Storefindy to help customers find their nearest store,
                        branch, or outlet — free to start.
                    </p>
                    <div className={styles.ctaBannerActions}>
                        <a href="https://demo.storefindy.com" className={`${styles.ctaButtonBox} ${styles.secondary}`}>See Our Live Demo</a>
                        <a href="/dashboard" className={styles.ctaButtonBox}>Create Your Free Locator</a>
                    </div>
                </div>
            </div>
        </>
    );
}
