import Link from 'next/link';
import Image from 'next/image';
import {
    TbBrandWordpress,
    TbPlayerPlay,
    TbCircleCheck,
    TbX,
    TbChevronRight,
    TbZoomIn,
    TbMap,
    TbSearch,
    TbLayoutGrid,
    TbFilter,
    TbUpload,
    TbAccessible,
    TbClock,
    TbNavigation,
    TbShoppingBag,
    TbBrandHtml5,
    TbBrandReact,
    TbWorld,
    TbUserPlus,
} from 'react-icons/tb';
import styles from './WordpressSinglePage.module.scss';
import PluginFaq from './PluginFaq';
import CopyButton from './CopyButton';
import { SITE_URL } from '@/utils/constant/jsonld';
import { buildSocialMetadata } from '@/utils/constant/seo';

const PLUGIN_SLUG = 'storefindy-store-locator';
const PLUGIN_URL = `https://wordpress.org/plugins/${PLUGIN_SLUG}/`;
const PLUGIN_VERSION = '1.0.1';
const SHORTCODE = '[storefindy_locator id="YOUR_LOCATOR_ID"]';

const pageTitle = 'WordPress Store Locator Plugin';
const pageDescription =
    'Add a free, interactive store locator to your WordPress website in minutes. Gutenberg block and shortcode, works with Elementor — no Google Maps API key required.';

export const metadata = {
    title: pageTitle,
    description: pageDescription,
    ...buildSocialMetadata({
        title: `${pageTitle} | Storefindy`,
        description: pageDescription,
        path: '/wordpress-store-locator-plugin',
    }),
};

const faqs = [
    {
        q: 'Is the Storefindy WordPress store locator plugin free?',
        a: 'Yes — the plugin is free to download and the Storefindy free plan is free forever. The free plan includes 1 locator and up to 25 store locations. No credit card required. Upgrade to Pro ($10/month) or Business ($30/month) for more locators, more locations, analytics, and branding removal.',
    },
    {
        q: 'Does this WordPress store locator plugin require a Google Maps API key?',
        a: 'No. Storefindy uses OpenStreetMap and Leaflet.js for its maps. You do not need a Google Maps API key, a Google Cloud account, or any billing setup. It works out of the box completely free.',
    },
    {
        q: 'Does it work with Elementor, Divi, and page builders?',
        a: (
            <>
                Yes. Use the shortcode <code>[storefindy_locator id=&quot;YOUR_ID&quot;]</code> in any Elementor text
                widget, Divi code module, WPBakery text block, or any page builder that accepts shortcodes. It also
                works in Classic Editor and in PHP templates via do_shortcode().
            </>
        ),
    },
    {
        q: 'Can I add multiple store locations?',
        a: 'Yes. Add locations manually one by one, or bulk upload hundreds of locations at once using the CSV import feature — available on all plans including free. The free plan supports up to 25 locations, Pro supports up to 500, and Business supports unlimited.',
    },
    {
        q: 'Can I customize the map style and colors to match my brand?',
        a: 'Yes. Use the Storefindy visual customizer to change map style (Standard, Dark, Minimal), pin color, background color, fonts, and search button style. Full customization including custom pin images and branding removal is available on Pro and Business plans.',
    },
    {
        q: 'What WordPress versions does the plugin support?',
        a: 'The plugin requires WordPress 6.0 or higher and PHP 7.4 or higher. It has been tested up to WordPress 7.0.4.',
    },
];

// Plain-text FAQ answers for structured data (JSX answers can't be serialized).
const faqJsonLdAnswers = {
    'Does it work with Elementor, Divi, and page builders?':
        'Yes. Use the shortcode [storefindy_locator id="YOUR_ID"] in any Elementor text widget, Divi code module, WPBakery text block, or any page builder that accepts shortcodes. It also works in Classic Editor and in PHP templates via do_shortcode().',
};

const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: {
            '@type': 'Answer',
            text: typeof a === 'string' ? a : faqJsonLdAnswers[q],
        },
    })),
};

const pluginJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Storefindy Store Locator',
    applicationCategory: 'BrowserApplication',
    operatingSystem: 'WordPress 6.0+',
    softwareVersion: PLUGIN_VERSION,
    url: `${SITE_URL}/wordpress-store-locator-plugin`,
    downloadUrl: PLUGIN_URL,
    description:
        'Free WordPress store locator plugin. Add an interactive, searchable store locator to any WordPress page with a Gutenberg block or shortcode — no Google Maps API key required.',
    offers: {
        '@type': 'Offer',
        price: 0,
        priceCurrency: 'USD',
    },
    publisher: {
        '@type': 'Organization',
        name: 'Storefindy',
        url: SITE_URL,
    },
};

const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        {
            '@type': 'ListItem',
            position: 2,
            name: 'WordPress Store Locator Plugin',
            item: `${SITE_URL}/wordpress-store-locator-plugin`,
        },
    ],
};

const heroMeta = [
    'Free forever plan',
    'No Google Maps API key',
    'Gutenberg block + shortcode',
    'Works with Elementor',
    'WCAG accessible',
];

const screenshots = [
    {
        src: `https://ps.w.org/${PLUGIN_SLUG}/assets/screenshot-6.png?rev=3651517`,
        alt: 'Storefindy WordPress plugin — store locator map view',
    },
    {
        src: `https://ps.w.org/${PLUGIN_SLUG}/assets/screenshot-1.png?rev=3651517`,
        alt: 'Storefindy WordPress plugin — locator list view',
    },
    {
        src: `https://ps.w.org/${PLUGIN_SLUG}/assets/screenshot-3.png?rev=3651517`,
        alt: 'Storefindy WordPress plugin — WordPress dashboard settings',
    },
];

const features = [
    {
        icon: TbMap,
        title: 'Interactive map — no Google Maps key',
        desc: 'Powered by OpenStreetMap and Leaflet.js. No API key setup. No monthly Google billing surprises.',
    },
    {
        icon: TbSearch,
        title: 'Search by location with autocomplete',
        desc: 'Customers type a city, zip code, or address and instantly find the nearest stores with address autocomplete.',
    },
    {
        icon: TbLayoutGrid,
        title: 'Gutenberg block + shortcode',
        desc: (
            <>
                Add the Store Locator block in the block editor, or use{' '}
                <code>[storefindy_locator id=&quot;...&quot;]</code> in Classic Editor, Elementor, or any page builder.
            </>
        ),
    },
    {
        icon: TbFilter,
        title: 'Location filters',
        desc: 'Let customers filter stores by category, region, or custom attributes to find exactly the location they need.',
    },
    {
        icon: TbUpload,
        title: 'Bulk CSV import',
        desc: 'Import hundreds of store locations at once via CSV directly from your WordPress dashboard. No manual entry needed.',
    },
    {
        icon: TbAccessible,
        title: 'WCAG-friendly & responsive',
        desc: 'Fully responsive across mobile, tablet, and desktop. Built with accessibility standards so all your customers can use it.',
    },
    {
        icon: TbClock,
        title: 'Store hours & business details',
        desc: 'Display opening hours, phone number, website link, and directions button for each store location.',
    },
    {
        icon: TbNavigation,
        title: 'Get directions button',
        desc: "One-tap directions from the customer's current location to any store — opens in Google Maps or Apple Maps.",
    },
];

const steps = [
    {
        num: '1',
        title: 'Install the plugin from WordPress.org',
        desc: (
            <>
                In your WordPress dashboard go to Plugins → Add New and search for{' '}
                <strong>Storefindy Store Locator</strong>. Click Install, then Activate. Or download the zip directly
                from wordpress.org and upload it manually.
            </>
        ),
    },
    {
        num: '2',
        title: 'Create a free Storefindy account',
        desc: (
            <>
                Sign up at <strong>storefindy.com</strong> with your Google account — no credit card required. Your
                dashboard is ready immediately.
            </>
        ),
    },
    {
        num: '3',
        title: 'Generate your API key',
        desc: (
            <>
                In your Storefindy dashboard go to <strong>Account → API Access</strong> and generate your API key. Copy
                it.
            </>
        ),
    },
    {
        num: '4',
        title: 'Connect the plugin to your account',
        desc: (
            <>
                In your WordPress dashboard go to <strong>Store Locator → Settings</strong>, paste your API key, and
                click Save. The plugin connects instantly.
            </>
        ),
    },
    {
        num: '5',
        title: 'Add locations and embed the locator',
        desc: (
            <>
                Create a locator under <strong>Store Locator → Locators</strong>, add your store locations, then add the
                Store Locator block to any page — or use the shortcode:
            </>
        ),
        code: SHORTCODE,
    },
];

const compareColumns = ['Storefindy', 'Stockist', 'Storemapper', 'WP Store Locator'];

// Each row value is either a label string or [icon, label] where icon is 'tick' | 'cross'.
const compareRows = [
    { feature: 'Free plan available', values: [['tick', 'Yes'], ['cross', 'No'], ['cross', 'No'], ['tick', 'Yes']] },
    {
        feature: 'No Google Maps API key',
        values: [['tick', 'Yes'], ['cross', 'Required'], ['cross', 'Required'], ['cross', 'Required']],
    },
    { feature: 'Gutenberg block', values: [['tick', 'Yes'], ['cross', 'No'], ['cross', 'No'], ['cross', 'No']] },
    { feature: 'Shortcode support', values: [['tick', 'Yes'], ['tick', 'Yes'], ['tick', 'Yes'], ['tick', 'Yes']] },
    {
        feature: 'CSV bulk import',
        values: [['tick', 'Yes — free'], ['tick', 'Paid only'], ['tick', 'Paid only'], ['cross', 'No']],
    },
    { feature: 'WCAG accessible', values: [['tick', 'Yes'], 'Partial', 'Partial', 'Partial'] },
    {
        feature: 'Visual customizer',
        values: [['tick', 'Yes'], ['tick', 'Yes'], ['tick', 'Yes'], ['cross', 'Limited']],
    },
    { feature: 'Analytics', values: [['tick', 'Pro+'], ['tick', 'Paid'], ['tick', 'Paid'], ['cross', 'No']] },
    { feature: 'Starting price', values: ['Free', '$19/mo', '$24/mo', 'Free (limited)'], priceRow: true },
];

const related = [
    {
        icon: TbShoppingBag,
        title: 'Shopify Store Locator App',
        badge: 'Coming soon',
        desc: 'Add an interactive store locator to your Shopify store. Find a retailer, dealer, or stockist near your customers.',
        href: null,
    },
    {
        icon: TbBrandHtml5,
        title: 'Plain HTML embed',
        desc: 'Paste one script tag into any website — no framework or plugin required. Works on any static or dynamic HTML site.',
        href: '/demo',
    },
    {
        icon: TbBrandReact,
        title: 'React / Next.js component',
        desc: 'Use the Storefindy React component to embed a store locator in your Next.js or React application.',
        href: '/demo',
    },
    {
        icon: TbWorld,
        title: 'Custom subdomain',
        desc: 'Host your locator at yourbrand.storefindy.com — a standalone branded page with no embed needed.',
        href: '/dashboard',
    },
];

function CompareCell({ value }) {
    if (Array.isArray(value)) {
        const [icon, label] = value;
        return (
            <span className={styles.tableCell}>
                {icon === 'tick' ? (
                    <TbCircleCheck className={styles.tick} aria-hidden="true" />
                ) : (
                    <TbX className={styles.cross} aria-hidden="true" />
                )}
                {label}
            </span>
        );
    }
    return value;
}

export default function WordPressStoreLocatorPluginPage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(pluginJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

            {/* BREADCRUMB + HERO */}
            <div className="wrap">
                <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                    <Link href="/">Home</Link>
                    <TbChevronRight aria-hidden="true" />
                    <span className={styles.breadcrumbCurrent} aria-current="page">
                        WordPress Store Locator Plugin
                    </span>
                </nav>

                <section className={styles.hero}>
                    <div className={styles.heroEyebrow}>
                        <TbBrandWordpress aria-hidden="true" /> Official WordPress Plugin
                    </div>
                    <h1 className={styles.heroTitle}>
                        The Free WordPress Store Locator Plugin — No Google Maps Key Needed
                    </h1>
                    <p className={styles.heroDesc}>
                        Add a beautiful, interactive store locator to your WordPress website in minutes. Works with
                        Gutenberg blocks, Elementor, Classic Editor, and shortcodes. Completely free to get started.
                    </p>
                    <div className={styles.heroActions}>
                        <a
                            href={PLUGIN_URL}
                            className="buttonBox"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <TbBrandWordpress aria-hidden="true" /> Download Free Plugin
                        </a>
                        <a href="/demo" className="buttonBox secondary">
                            <TbPlayerPlay aria-hidden="true" /> View Live Demo
                        </a>
                    </div>
                    <div className={styles.heroMeta}>
                        {heroMeta.map((item) => (
                            <div className={styles.heroMetaItem} key={item}>
                                <TbCircleCheck aria-hidden="true" /> {item}
                            </div>
                        ))}
                    </div>
                </section>

                {/* WORDPRESS.ORG BADGE */}
                <div className={styles.wpBadge}>
                    <div className={styles.wpBadgeIcon}>
                        <TbBrandWordpress aria-hidden="true" />
                    </div>
                    <span>
                        Listed on the official WordPress Plugin Directory —{' '}
                        <a href={PLUGIN_URL} target="_blank" rel="noopener noreferrer">
                            wordpress.org/plugins/{PLUGIN_SLUG}
                        </a>
                    </span>
                    <span className={styles.wpBadgeVersion}>v{PLUGIN_VERSION}</span>
                </div>
            </div>

            {/* SCREENSHOTS */}
            <section className={styles.section}>
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>Plugin screenshots</div>
                        <div className={styles.sectionTitle}>See the plugin in action</div>
                        <div className={styles.sectionSub}>
                            The store locator on the front end, the list view your customers search, and the settings
                            screen inside your WordPress dashboard.
                        </div>
                    </div>
                    <div className={styles.screenshotStrip}>
                        {screenshots.map(({ src, alt }) => (
                            <a
                                className={styles.screenshotThumb}
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                key={src}
                            >
                                <Image src={src} alt={alt} width={1280} height={720} loading="lazy" />
                                <span className={styles.screenshotOverlay}>
                                    <TbZoomIn aria-hidden="true" />
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* WHAT IS IT */}
            <section className={styles.sectionAlt}>
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>What is it</div>
                        <div className={styles.sectionTitle}>
                            A WordPress store locator plugin that actually works — free
                        </div>
                    </div>
                    <div className={styles.prose} style={{ margin: '0 auto' }}>
                        <p>
                            The Storefindy Store Locator plugin connects your WordPress website directly to your
                            Storefindy account. Manage all your store locations from the Storefindy dashboard, and
                            display an interactive, searchable store locator on any WordPress page or post — using a
                            Gutenberg block or a simple shortcode.
                        </p>
                        <p>
                            Unlike other WordPress store locator plugins that require a Google Maps API key or charge
                            expensive monthly fees just to list a few stores, Storefindy runs on OpenStreetMap —
                            completely free, no API key required. Your free plan includes 1 locator and up to 25
                            locations. No credit card needed.
                        </p>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className={styles.section} id="features">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>Plugin features</div>
                        <div className={styles.sectionTitle}>Everything your store locator needs — built in</div>
                        <div className={styles.sectionSub}>
                            Every feature below is included in the free plugin — no add-ons, no upsells to get a working
                            store locator live on your site.
                        </div>
                    </div>
                    <div className={styles.featuresGrid}>
                        {features.map(({ icon: Icon, title, desc }) => (
                            <div className={styles.featureCard} key={title}>
                                <div className={styles.featureIcon}>
                                    <Icon aria-hidden="true" />
                                </div>
                                <div className={styles.featureTitle}>{title}</div>
                                <div className={styles.featureDesc}>{desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* INSTALLATION */}
            <section className={styles.sectionAlt} id="installation">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>Installation</div>
                        <div className={styles.sectionTitle}>
                            Install the WordPress store locator plugin in 5 minutes
                        </div>
                        <div className={styles.sectionSub}>
                            No developer needed. Five steps from a fresh WordPress install to a live store locator.
                        </div>
                    </div>
                    <div className={styles.steps}>
                        {steps.map(({ num, title, desc, code }, i) => (
                            <div className={styles.step} key={num}>
                                <div className={styles.stepLeft}>
                                    <div className={styles.stepNum}>{num}</div>
                                    {i < steps.length - 1 && <div className={styles.stepLine} />}
                                </div>
                                <div className={styles.stepBody}>
                                    <div className={styles.stepTitle}>{title}</div>
                                    <div className={styles.stepDesc}>{desc}</div>
                                    {code && <code className={styles.stepCode}>{code}</code>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SHORTCODE */}
            <section className={styles.section} id="shortcode">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>Shortcode</div>
                        <div className={styles.sectionTitle}>
                            Works everywhere — block editor, Classic Editor, Elementor
                        </div>
                        <div className={styles.sectionSub}>
                            Use the Gutenberg block for drag-and-drop placement, or the shortcode for Classic Editor,
                            Elementor, Divi, WPBakery, or any theme template.
                        </div>
                    </div>
                    <div className={styles.prose} style={{ margin: '0 auto' }}>
                        <div className={styles.codeBlock}>
                            <div className={styles.codeHeader}>
                                <span className={styles.codeLang}>Shortcode</span>
                                <CopyButton text={SHORTCODE} />
                            </div>
                            <pre className={styles.codePre}>
                                <span className={styles.codeComment}># Basic — renders your store locator</span>
                                {'\n[storefindy_locator id='}
                                <span className={styles.codeStr}>&quot;YOUR_LOCATOR_ID&quot;</span>
                                {']\n\n'}
                                <span className={styles.codeComment}># In PHP templates</span>
                                {
                                    '\n<?php echo do_shortcode(\'[storefindy_locator id="YOUR_LOCATOR_ID"]\'); ?>'
                                }
                            </pre>
                        </div>
                        <p className={styles.codeNote}>
                            Your locator IDs and ready-to-copy shortcodes are listed under{' '}
                            <strong>Store Locator → How to Use</strong> in your WordPress dashboard.
                        </p>
                    </div>
                </div>
            </section>

            {/* COMPARE */}
            <section className={styles.sectionAlt} id="compare">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>Why Storefindy</div>
                        <div className={styles.sectionTitle}>
                            How Storefindy compares to other WordPress store locator plugins
                        </div>
                        <div className={styles.sectionSub}>
                            The same features other plugins put behind a monthly subscription — free, and without a
                            Google Maps API key.
                        </div>
                    </div>
                    <div className={styles.tableScroll}>
                        <table className={styles.compareTable}>
                            <thead>
                                <tr>
                                    <th scope="col">Feature</th>
                                    {compareColumns.map((name, i) => (
                                        <th scope="col" className={i === 0 ? styles.tableHl : ''} key={name}>
                                            {name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {compareRows.map(({ feature, values, priceRow }) => (
                                    <tr key={feature}>
                                        <td>{feature}</td>
                                        {values.map((value, i) => (
                                            <td
                                                className={priceRow && i === 0 ? styles.tablePriceFree : ''}
                                                key={`${feature}-${compareColumns[i]}`}
                                            >
                                                <CompareCell value={value} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className={styles.section} id="faq">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>FAQ</div>
                        <div className={styles.sectionTitle}>Frequently asked questions</div>
                        <div className={styles.sectionSub}>
                            Everything you need to know about the Storefindy WordPress plugin. Can&apos;t find your
                            answer? <Link href="/contact-us">Contact our support team.</Link>
                        </div>
                    </div>
                    <PluginFaq items={faqs} />
                </div>
            </section>

            {/* RELATED */}
            <section className={styles.sectionAlt} id="integrations">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>More integrations</div>
                        <div className={styles.sectionTitle}>More ways to embed Storefindy</div>
                        <div className={styles.sectionSub}>
                            WordPress is just one option. Storefindy embeds anywhere you can paste a script tag.
                        </div>
                    </div>
                    <div className={styles.relatedGrid}>
                        {related.map(({ icon: Icon, title, badge, desc, href }) => {
                            const body = (
                                <>
                                    <div className={styles.relatedIcon}>
                                        <Icon aria-hidden="true" />
                                    </div>
                                    <div className={styles.relatedBody}>
                                        <div className={styles.relatedTitle}>
                                            {title}
                                            {badge && <span className={styles.relatedBadge}>{badge}</span>}
                                        </div>
                                        <div className={styles.relatedDesc}>{desc}</div>
                                    </div>
                                    {href && <TbChevronRight className={styles.relatedArrow} aria-hidden="true" />}
                                </>
                            );

                            return href ? (
                                <Link className={styles.relatedCard} href={href} key={title}>
                                    {body}
                                </Link>
                            ) : (
                                <div className={styles.relatedCard} key={title}>
                                    {body}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA BANNER */}
            <div className="wrap">
                <div className={styles.ctaBanner} style={{ marginTop: 64 }}>
                    <h2>Add a store locator to WordPress — free</h2>
                    <p>
                        Install the plugin, connect your account, and your customers can find your nearest store in
                        minutes. No Google Maps key. No monthly fee to get started.
                    </p>
                    <div className={styles.ctaBannerActions}>
                        <a
                            href={PLUGIN_URL}
                            className={styles.ctaButtonBox}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <TbBrandWordpress aria-hidden="true" /> Download Free Plugin
                        </a>
                        <a href="/dashboard" className={`${styles.ctaButtonBox} ${styles.secondary}`}>
                            <TbUserPlus aria-hidden="true" /> Create Free Account
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
