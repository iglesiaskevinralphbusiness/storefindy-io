import Link from 'next/link';
import Image from 'next/image';
import {
    TbShoppingBag,
    TbPlayerPlay,
    TbCircleCheck,
    TbX,
    TbChevronRight,
    TbZoomIn,
    TbMap,
    TbSearch,
    TbPuzzle,
    TbCurrentLocation,
    TbUpload,
    TbClock,
    TbNavigation,
    TbChartBar,
    TbPalette,
    TbMapPin,
    TbBrandWordpress,
    TbBrandHtml5,
    TbBrandReact,
    TbWorld,
    TbUserPlus,
    TbCreditCardOff,
} from 'react-icons/tb';
import styles from './ShopifySinglePage.module.scss';
import AppFaq from './AppFaq';
import { SITE_URL } from '@/utils/constant/jsonld';
import { buildSocialMetadata } from '@/utils/constant/seo';

const APP_HANDLE = 'storefindy-store-locator';
const APP_URL = `https://apps.shopify.com/${APP_HANDLE}`;
const APP_NAME = 'Storefindy ‑ Store Locator Map';
// Public listing data, checked against the Shopify App Store listing on 2026-09-04.
const COMPARISON_CHECKED = 'September 2026';

const pageTitle = 'Shopify Store Locator App';
const pageDescription =
    'Add a searchable store locator map to your Shopify store. Shoppers search by city, state, or postal code and get directions — theme app block, no code, free plan available.';

export const metadata = {
    title: pageTitle,
    description: pageDescription,
    ...buildSocialMetadata({
        title: `${pageTitle} | Storefindy`,
        description: pageDescription,
        path: '/shopify-store-locator-app',
    }),
};

const faqs = [
    {
        q: 'Is the Storefindy Shopify store locator app free?',
        a: 'Yes — there is a free plan, free forever. It includes 1 locator, up to 20 store locations, basic customization, and CSV import. No credit card is required to start. Paid plans are Pro at $10/month and Business at $30/month.',
    },
    {
        q: 'Do I have to edit my theme code to install it?',
        a: 'No. The map is added with a theme app extension. You turn on the Storefindy app embed and drop the Store locator map app block onto any page from the Shopify theme editor. There are no theme file edits, no Liquid snippets to paste, and nothing is left behind in your theme if you uninstall the app.',
    },
    {
        q: 'Does it require a Google Maps API key?',
        a: 'No. Storefindy uses OpenStreetMap and Leaflet.js. You do not need a Google Maps API key, a Google Cloud account, or any billing setup — the map works as soon as the app block is on the page.',
    },
    {
        q: 'How do shoppers search for a store?',
        a: 'Shoppers can type a city, state, or postal code, or use their device geolocation to see the nearest locations. Results show as pins on the map alongside a list with address, hours, and a directions link.',
    },
    {
        q: 'Can I import my store locations in bulk?',
        a: 'Yes. CSV import is available on every plan, including the free plan. Upload a CSV of your stockists, dealers, or pickup points and they are added at once instead of one at a time.',
    },
    {
        q: 'How am I billed for a paid plan?',
        a: (
            <>
                Through Shopify. Paid plans for the Shopify app are charged with the <strong>Shopify Billing API</strong>,
                so the subscription appears on your regular Shopify invoice. Storefindy never collects card details for
                the Shopify app.
            </>
        ),
    },
    {
        q: 'Can I match the map to my store theme?',
        a: 'Yes. The visual customizer controls map style, pin color, background, fonts, and the search button. Pro and Business plans add deeper customization, optional custom pin icons, and branding removal on Business.',
    },
    {
        q: 'Can I see how shoppers use the locator?',
        a: 'Yes. Built-in analytics track map views and what shoppers search for. Basic analytics are on the Pro plan; the Business plan adds advanced analytics and a search heatmap so you can see which areas ask for a store you do not have yet.',
    },
];

// Plain-text FAQ answers for structured data (JSX answers can't be serialized).
const faqJsonLdAnswers = {
    'How am I billed for a paid plan?':
        'Through Shopify. Paid plans for the Shopify app are charged with the Shopify Billing API, so the subscription appears on your regular Shopify invoice. Storefindy never collects card details for the Shopify app.',
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

const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: APP_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Shopify',
    url: `${SITE_URL}/shopify-store-locator-app`,
    installUrl: APP_URL,
    description:
        'Shopify store locator app. Add a searchable store locator map to your Shopify storefront with a theme app block — shoppers search by city, state, or postal code and get directions. No theme code and no Google Maps API key required.',
    offers: [
        { '@type': 'Offer', name: 'Free', price: 0, priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Pro', price: 10, priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Business', price: 30, priceCurrency: 'USD' },
    ],
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
            name: 'Shopify Store Locator App',
            item: `${SITE_URL}/shopify-store-locator-app`,
        },
    ],
};

const heroMeta = [
    'Free plan available',
    'No theme code edits',
    'No Google Maps API key',
    'Billed through Shopify',
    'Mobile responsive',
];

const screenshots = [
    {
        src: 'https://cdn.shopify.com/app-store/listing_images/f852531f3f4a1d46d1b79610dfe22546/desktop_screenshot/CPixz-KkvJYDEAE=.png',
        alt: 'Storefindy Shopify app — store locator map on a Shopify storefront',
    },
    {
        src: 'https://cdn.shopify.com/app-store/listing_images/f852531f3f4a1d46d1b79610dfe22546/desktop_screenshot/CNOO2-KkvJYDEAE=.png',
        alt: 'Storefindy Shopify app — managing store locations in the Shopify admin',
    },
    {
        src: 'https://cdn.shopify.com/app-store/listing_images/f852531f3f4a1d46d1b79610dfe22546/desktop_screenshot/CIvv5eKkvJYDEAE=.png',
        alt: 'Storefindy Shopify app — visual map customizer',
    },
];

const features = [
    {
        icon: TbPuzzle,
        title: 'Theme app block — no code',
        desc: 'Turn on the app embed and drag the Store locator map block onto any page in the theme editor. No Liquid edits, and nothing left behind if you uninstall.',
    },
    {
        icon: TbSearch,
        title: 'Search by city, state, or postal code',
        desc: 'Shoppers type where they are and instantly see the closest locations, as pins on the map and as a readable list beside it.',
    },
    {
        icon: TbCurrentLocation,
        title: 'Use my location',
        desc: 'One tap uses the shopper’s device geolocation to centre the map on the stores nearest to them — no typing required.',
    },
    {
        icon: TbMap,
        title: 'Interactive map — no Google Maps key',
        desc: 'Powered by OpenStreetMap and Leaflet.js. No API key setup, no Google Cloud account, and no monthly Google billing surprises.',
    },
    {
        icon: TbClock,
        title: 'Hours and holidays',
        desc: 'Show opening hours for each location plus holiday overrides, so shoppers never drive to a store that is closed today.',
    },
    {
        icon: TbUpload,
        title: 'Bulk CSV import',
        desc: 'Import your stockists, dealers, or pickup points from a CSV in one go — available on every plan, including free.',
    },
    {
        icon: TbPalette,
        title: 'Visual customizer',
        desc: 'Match your storefront: map style, pin colour, background, fonts, and search button. Optional custom pin icons for your brand.',
    },
    {
        icon: TbNavigation,
        title: 'Get directions',
        desc: 'Every location gets a directions link that opens the shopper’s own maps app, straight from their current position.',
    },
    {
        icon: TbChartBar,
        title: 'Built-in analytics',
        desc: 'See map views and what shoppers search for. Business adds an advanced view and a heatmap of the areas asking for a store.',
    },
];

const steps = [
    {
        num: '1',
        title: 'Install from the Shopify App Store',
        desc: (
            <>
                Open the <strong>{APP_NAME}</strong> listing and click Install. Shopify handles the permission screen and
                the app opens inside your Shopify admin — there is no separate password to create.
            </>
        ),
    },
    {
        num: '2',
        title: 'Add your store locations',
        desc: (
            <>
                Add locations one by one with address, hours, and holidays, or import them all at once from a CSV. The
                free plan covers up to 20 locations.
            </>
        ),
    },
    {
        num: '3',
        title: 'Customize the map',
        desc: 'Use the visual customizer to set the map style, pin colour, fonts, and search button so the locator matches your theme.',
    },
    {
        num: '4',
        title: 'Turn on the app embed',
        desc: (
            <>
                In <strong>Online Store → Themes → Customize</strong>, open <strong>App embeds</strong> and switch on
                Storefindy. This lets the theme editor load the locator.
            </>
        ),
    },
    {
        num: '5',
        title: 'Drop the Store locator map block on a page',
        desc: (
            <>
                Still in the theme editor, click <strong>Add block → Store locator map</strong> on the page you want,
                pick your locator from the dropdown, and Save. Your storefront locator is live.
            </>
        ),
    },
];

const callouts = [
    {
        icon: TbPuzzle,
        title: 'App embed + app block',
        desc: (
            <>
                The storefront map is a <strong>theme app extension</strong>. The app embed makes it available to your
                theme, and the app block is what you place on a page — both from the theme editor.
            </>
        ),
        path: 'Online Store → Themes → Customize → App embeds → Storefindy',
    },
    {
        icon: TbMapPin,
        title: 'A ready-made Store Locator page',
        desc: (
            <>
                Prefer a dedicated page? The app can create a <strong>Store Locator</strong> page for you, so all you do
                is add the block and link it from your navigation.
            </>
        ),
        path: 'Online Store → Pages → Store Locator',
    },
];

const plans = [
    {
        name: 'Free',
        price: '$0',
        period: 'Free forever',
        items: ['1 locator', 'Up to 20 locations', 'Basic customization', 'CSV import'],
    },
    {
        name: 'Pro',
        price: '$10',
        period: 'per month, billed by Shopify',
        featured: true,
        tag: 'Most popular',
        items: ['3 locators', 'Up to 500 locations', 'Semi-customization', 'CSV import', 'Basic analytics'],
    },
    {
        name: 'Business',
        price: '$30',
        period: 'per month, billed by Shopify',
        items: [
            '10 locators',
            'Up to 2,000 locations',
            'CSV import',
            'Advanced analytics & heatmap',
            'Remove Storefindy branding',
            'Priority support',
        ],
    },
];

const compareColumns = ['Storefindy', 'Stockist', 'Storemapper'];

// Each row value is either a label string or [icon, label] where icon is 'tick' | 'cross'.
const compareRows = [
    {
        feature: 'Free plan',
        values: [['tick', 'Yes — free forever'], ['cross', 'No — 14-day trial'], ['tick', 'Yes']],
    },
    { feature: 'Locations on the free plan', values: ['20', '—', '1'] },
    {
        feature: 'Entry paid plan',
        values: ['$10/mo — 500 locations', '$10/mo — 100 locations', '$24.99/mo — 100 locations'],
        priceRow: true,
    },
    {
        feature: 'Top plan',
        values: ['$30/mo — 2,000 locations', '$40/mo — 2,000 locations', '$69.99/mo — 10,000 locations'],
    },
    { feature: 'CSV import on the free plan', values: [['tick', 'Yes'], ['cross', 'No free plan'], 'Free plan is 1 location'] },
];

const related = [
    {
        icon: TbBrandWordpress,
        title: 'WordPress Store Locator Plugin',
        badge: 'Free plugin',
        desc: 'Add the same store locator to a WordPress site with a Gutenberg block or shortcode. Works with Elementor, Divi, and Classic Editor.',
        href: '/wordpress-store-locator-plugin',
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

export default function ShopifyStoreLocatorAppPage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
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
                        Shopify Store Locator App
                    </span>
                </nav>

                <section className={styles.hero}>
                    <div className={styles.heroEyebrow}>
                        <TbShoppingBag aria-hidden="true" /> On the Shopify App Store
                    </div>
                    <h1 className={styles.heroTitle}>
                        The Shopify Store Locator App — Add a Store Map Without Touching Your Theme
                    </h1>
                    <p className={styles.heroDesc}>
                        Let shoppers find your nearest store. They search by city, state, or postal code, see your
                        locations as pins on a map, and get directions in one tap. Install from the Shopify App Store and
                        place it with a theme app block — no code, and a free plan to start.
                    </p>
                    <div className={styles.heroActions}>
                        <a href={APP_URL} className="buttonBox" target="_blank" rel="noopener noreferrer">
                            <TbShoppingBag aria-hidden="true" /> Install on Shopify
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

                {/* SHOPIFY APP STORE BADGE */}
                <div className={styles.appBadge}>
                    <div className={styles.appBadgeIcon}>
                        <TbShoppingBag aria-hidden="true" />
                    </div>
                    <span>
                        Listed on the Shopify App Store —{' '}
                        <a href={APP_URL} target="_blank" rel="noopener noreferrer">
                            apps.shopify.com/{APP_HANDLE}
                        </a>
                    </span>
                    <span className={styles.appBadgeTag}>Store locator</span>
                </div>
            </div>

            {/* SCREENSHOTS */}
            <section className={styles.section}>
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>App screenshots</div>
                        <div className={styles.sectionTitle}>See the app in action</div>
                        <div className={styles.sectionSub}>
                            The locator on a live storefront, the location manager inside your Shopify admin, and the
                            visual customizer that matches the map to your theme.
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
                            A store locator for Shopify that installs in minutes, not hours
                        </div>
                    </div>
                    <div className={styles.prose} style={{ margin: '0 auto' }}>
                        <p>
                            Storefindy adds a searchable store locator map to your Shopify storefront. Shoppers search by
                            city, state, or postal code — or tap once to use their own location — and see your stores,
                            stockists, dealers, or pickup points as pins on a map with hours, contact details, and a
                            directions link.
                        </p>
                        <p>
                            You manage everything from the app inside your Shopify admin: add locations by hand or import
                            them from a CSV, set hours and holidays, and style the map in a visual customizer. Placing it
                            on your storefront is a <strong>theme app block</strong> — no Liquid to paste, no theme file
                            to back up, and nothing left in your theme if you ever uninstall.
                        </p>
                        <p>
                            The map runs on OpenStreetMap and Leaflet.js, so there is <strong>no Google Maps API key</strong>{' '}
                            to create and no Google Cloud billing to watch. The free plan covers 1 locator and up to 20
                            locations, forever, and paid plans are charged through your regular Shopify invoice.
                        </p>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className={styles.section} id="features">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>App features</div>
                        <div className={styles.sectionTitle}>Everything a Shopify store locator needs</div>
                        <div className={styles.sectionSub}>
                            Search, map, hours, directions, and CSV import — the parts shoppers actually use are in the
                            free plan.
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
                        <div className={styles.sectionTitle}>Set up your Shopify store locator in 5 steps</div>
                        <div className={styles.sectionSub}>
                            No developer, no theme backup, no code. Everything happens in your Shopify admin and the
                            theme editor.
                        </div>
                    </div>
                    <div className={styles.steps}>
                        {steps.map(({ num, title, desc }, i) => (
                            <div className={styles.step} key={num}>
                                <div className={styles.stepLeft}>
                                    <div className={styles.stepNum}>{num}</div>
                                    {i < steps.length - 1 && <div className={styles.stepLine} />}
                                </div>
                                <div className={styles.stepBody}>
                                    <div className={styles.stepTitle}>{title}</div>
                                    <div className={styles.stepDesc}>{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* NO-CODE CALLOUTS */}
            <section className={styles.section} id="no-code">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>No theme edits</div>
                        <div className={styles.sectionTitle}>Where the locator lives in your theme</div>
                        <div className={styles.sectionSub}>
                            Storefindy uses Shopify&apos;s theme app extension, so the map is added and removed from the
                            theme editor — never from your theme files.
                        </div>
                    </div>
                    <div className={styles.calloutGrid}>
                        {callouts.map(({ icon: Icon, title, desc, path }) => (
                            <div className={styles.calloutCard} key={title}>
                                <div className={styles.calloutHead}>
                                    <Icon aria-hidden="true" />
                                    {title}
                                </div>
                                <div className={styles.calloutDesc}>{desc}</div>
                                <code className={styles.calloutPath}>{path}</code>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section className={styles.sectionAlt} id="pricing">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>Pricing</div>
                        <div className={styles.sectionTitle}>Start free, upgrade only when you outgrow it</div>
                        <div className={styles.sectionSub}>
                            Paid plans are charged through the Shopify Billing API and appear on your Shopify invoice.
                        </div>
                    </div>
                    <div className={styles.planGrid}>
                        {plans.map(({ name, price, period, items, featured, tag }) => (
                            <div
                                className={`${styles.planCard} ${featured ? styles.planFeatured : ''}`}
                                key={name}
                            >
                                <div className={styles.planName}>
                                    {name}
                                    {tag && <span className={styles.planTag}>{tag}</span>}
                                </div>
                                <div className={styles.planPrice}>{price}</div>
                                <div className={styles.planPeriod}>{period}</div>
                                <ul className={styles.planList}>
                                    {items.map((item) => (
                                        <li key={item}>
                                            <TbCircleCheck aria-hidden="true" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <p className={styles.planNote}>
                        <TbCreditCardOff aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        No credit card needed for the free plan. Prices are in USD.
                    </p>
                </div>
            </section>

            {/* COMPARE */}
            <section className={styles.section} id="compare">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>Why Storefindy</div>
                        <div className={styles.sectionTitle}>
                            How Storefindy compares to other Shopify store locator apps
                        </div>
                        <div className={styles.sectionSub}>
                            A free plan you can actually launch on, and five times the locations at the same entry
                            price.
                        </div>
                    </div>
                    <div className={styles.tableScroll}>
                        <table className={styles.compareTable}>
                            <thead>
                                <tr>
                                    <th scope="col">Plans</th>
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
                    <p className={styles.tableFootnote}>
                        Plan details taken from each app&apos;s public Shopify App Store listing in {COMPARISON_CHECKED}.
                        Other apps may have changed their pricing since — check their listing for the current figures.
                    </p>
                </div>
            </section>

            {/* FAQ */}
            <section className={styles.sectionAlt} id="faq">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>FAQ</div>
                        <div className={styles.sectionTitle}>Frequently asked questions</div>
                        <div className={styles.sectionSub}>
                            Everything you need to know about the Storefindy Shopify app. Can&apos;t find your answer?{' '}
                            <Link href="/contact-us">Contact our support team.</Link>
                        </div>
                    </div>
                    <AppFaq items={faqs} />
                </div>
            </section>

            {/* RELATED */}
            <section className={styles.section} id="integrations">
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>More integrations</div>
                        <div className={styles.sectionTitle}>More ways to embed Storefindy</div>
                        <div className={styles.sectionSub}>
                            Shopify is one option. The same locator embeds anywhere you can paste a script tag.
                        </div>
                    </div>
                    <div className={styles.relatedGrid}>
                        {related.map(({ icon: Icon, title, badge, desc, href }) => (
                            <Link className={styles.relatedCard} href={href} key={title}>
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
                                <TbChevronRight className={styles.relatedArrow} aria-hidden="true" />
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA BANNER */}
            <div className="wrap">
                <div className={styles.ctaBanner} style={{ marginTop: 64 }}>
                    <h2>Add a store locator to Shopify — free</h2>
                    <p>
                        Install the app, add your locations, and drop the block on a page. Your shoppers can find their
                        nearest store today. No theme code. No Google Maps key. No card to start.
                    </p>
                    <div className={styles.ctaBannerActions}>
                        <a
                            href={APP_URL}
                            className={styles.ctaButtonBox}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <TbShoppingBag aria-hidden="true" /> Install on Shopify
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
