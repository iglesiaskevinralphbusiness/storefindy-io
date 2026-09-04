
import Link from 'next/link';
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
    TbBrandWordpress,
    TbBrandHtml5,
    TbBrandReact,
    TbArrowRight,
    TbBell,
    TbStar,
    TbWorld,
} from 'react-icons/tb';
import styles from './page.module.scss';
import { plans } from '@/utils/constant/pricing';
import { faqs } from '@/utils/constant/faqs';
import FaqHome from '@/components/FaqHome';
import FadeIn from '@/components/FadeIn';
import Image from 'next/image';
import { buildSocialMetadata } from '@/utils/constant/seo';

const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: {
            '@type': 'Answer',
            text: a,
        },
    })),
};

const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Storefindy',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Store locator widget for your website. Fast, map-based, mobile-friendly, and embeddable on any site.',
    offers: plans.map((plan) => ({
        '@type': 'Offer',
        name: `${plan.name} plan`,
        description: plan.desc,
        price: Number(plan.price.replace(/[^0-9.]/g, '')),
        priceCurrency: 'USD',
        category: 'subscription',
        url: 'https://www.storefindy.com/#pricing',
    })),
};

const wordpressPluginJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Storefindy Store Locator for WordPress',
    operatingSystem: 'WordPress',
    applicationCategory: 'BusinessApplication',
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
    },
    url: 'https://wordpress.org/plugins/storefindy-store-locator/',
};

const homeTitle = 'Cheapest Store Locator Widget for Your Website — Free Forever Plan | Storefindy';
const homeDescription =
    'Create a store locator for your website in minutes. Fast, map-based, mobile-friendly. Free plan available — no credit card required.';

export const metadata = {
    title: { absolute: homeTitle },
    description: homeDescription,
    ...buildSocialMetadata({ title: homeTitle, description: homeDescription, path: '/' }),
};

const industries = [
    { icon: TbShoppingBag, label: 'Retail' },
    { icon: TbHeartRateMonitor, label: 'Healthcare' },
    { icon: TbToolsKitchen2, label: 'Food & Beverage' },
    { icon: TbBuildingBank, label: 'Finance' },
    { icon: TbPill, label: 'Pharmacy' },
    { icon: TbHanger, label: 'Fashion' },
];

const features = [
    { icon: TbGift, title: 'Free forever', desc: 'No monthly fees, no credit card, no surprise charges. Our core store locator widget is completely free for stores with 20 locations and below.' },
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

const platforms = [
    {
        key: 'wordpress',
        icon: TbBrandWordpress,
        title: 'WordPress',
        badge: { label: 'Plugin available', className: 'badgeNew' },
        desc: 'Install the official Storefindy plugin from the WordPress Plugin Directory. Add your store locator using the Gutenberg block or shortcode — no coding required.',
        features: [
            'Gutenberg block + shortcode',
            'Works with Elementor & Classic Editor',
            'No Google Maps API key needed',
            'Free to install',
        ],
        note: 'Listed on WordPress Plugin Directory',
        cta: 'Learn more about the WordPress plugin',
        href: '/wordpress-store-locator-plugin',
        featured: true,
    },
    {
        key: 'shopify',
        icon: TbShoppingBag,
        title: 'Shopify',
        badge: { label: 'App available', className: 'badgeNew' },
        desc: 'Add a store locator to your Shopify store from the Shopify App Store. Help customers find your nearest stockist, retailer, or pickup location — directly from your shop.',
        features: [
            'One-click install from Shopify App Store',
            'Theme section block support',
            'Syncs with your Storefindy dashboard',
            'No Google Maps API key needed',
        ],
        note: 'Listed on Shopify App Store',
        cta: "Learn more about the Shopify app",
        href: '/shopify-store-locator-app',
        featured: true,
    },
    {
        key: 'html',
        icon: TbBrandHtml5,
        title: 'Plain HTML — any website',
        badge: { label: 'All plans', className: 'badgeFree' },
        desc: 'Paste two lines of code into any website and your store locator is live. Works on Wix, Squarespace, Webflow, or any static site — no plugin or framework needed.',
        code: (
            <>
                <span className={styles.codeComment}>{'<!-- Place this where you want the locator -->'}</span>
                {'\n'}
                <span className={styles.codeTag}>{'<locator-widget'}</span> <span className={styles.codeAttr}>locator</span>=
                <span className={styles.codeStr}>&quot;YOUR_ID&quot;</span>
                <span className={styles.codeTag}>{'></locator-widget>'}</span>
                {'\n'}
                <span className={styles.codeComment}>{'<!-- Add before closing </body> tag -->'}</span>
                {'\n'}
                <span className={styles.codeTag}>{'<script'}</span> <span className={styles.codeAttr}>src</span>=
                <span className={styles.codeStr}>&quot;https://www.storefindy.com/widgets.js&quot;</span>
                <span className={styles.codeTag}>{'></script>'}</span>
            </>
        ),
        cta: 'View embed guide',
        href: '/dashboard/locators/embed',
        featured: true,
    },
    {
        key: 'react',
        icon: TbBrandReact,
        title: 'React / Next.js',
        badge: { label: 'All plans', className: 'badgeFree' },
        desc: 'Use the Storefindy React component to embed a store locator in your Next.js, Vite, or React application. Drop it in as a component with your locator ID as a prop.',
        code: (
            <>
                <span className={styles.codeTag}>import</span> StoreLocator{' '}
                <span className={styles.codeTag}>from</span>{' '}
                <span className={styles.codeStr}>&apos;@storefindy/react&apos;</span>
                {'\n\n'}
                <span className={styles.codeTag}>{'<StoreLocator'}</span>
                {'\n  '}
                <span className={styles.codeAttr}>locatorId</span>=
                <span className={styles.codeStr}>&quot;YOUR_LOCATOR_ID&quot;</span>
                {'\n'}
                <span className={styles.codeTag}>{'/>'}</span>
            </>
        ),
        cta: "Notify me when it's available",
        href: '/contact-us',
        featured: true,
        comingSoon: true,
    },
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
        text: '"I imported 120 pharmacy locations in one CSV upload. The map was live on our website within an hour. Couldn\'t believe it was fast."',
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


export default async function Home() {
    return (<>
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(wordpressPluginJsonLd) }}
        />

        <noscript>
            <style>{'[data-sf-fade] > *{opacity:1!important;transform:none!important;animation:none!important}'}</style>
        </noscript>

        <div className='wrap'>
            <section className={styles.hero}>
                <FadeIn immediate>
                    <h1>Store Locator for Your Website — Beautiful and Fast at the Cheapest Cost</h1>
                </FadeIn>
                <FadeIn immediate delay={120}>
                    <p>Customized to your brand. Live in minutes. No developer, zero complexity — just a store locator that works.</p>
                </FadeIn>
                <FadeIn immediate delay={220}>
                    <div className={styles.buttonBox}>
                        <a href="/demo" className="buttonBox secondary">See Our Live Demo</a>
                        <a href="/dashboard" className="buttonBox">Create Store Locator</a>
                    </div>
                </FadeIn>

                <FadeIn immediate delay={320}>
                    <div className={styles.heroSample}>
                        <div className={styles.heroSampleInner}>
                            <Image src="/images/hero-demo.png" alt="Store Locator" width={1000} height={1000} loading='eager' />
                            <Image src="/images/hero-demo-mobile.png" alt="Store Locator" width={375} height={667} loading='eager' />
                        </div>
                    </div>
                </FadeIn>
            </section>
        </div>

        {/* LOGOS */}
        <div className={styles.logos}>
            <FadeIn>
                <p>Trusted by businesses across every industry</p>
            </FadeIn>
            <div className={styles.logosRow}>
                {industries.map(({ icon: Icon, label }, i) => (
                    <FadeIn key={label} delay={i * 70}>
                        <div className={styles.logoPill}>
                            <Icon aria-hidden="true" /> {label}
                        </div>
                    </FadeIn>
                ))}
            </div>
        </div>
        
        <div className='wrap'>
            {/* FEATURES */}
            <section className={styles.features} id="features">
                <FadeIn>
                    <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
                        <div className={styles.sectionLabel}>Features</div>
                        <div className={styles.sectionTitle}>Everything you need to help customers find your stores</div>
                        <div className={styles.sectionSub}>Storefindy gives you a powerful, customizable store locator widget — built for small businesses, with zero cost and zero complexity.</div>
                    </div>
                </FadeIn>
                <div className={styles.featuresGrid}>
                    {features.map(({ icon: Icon, title, desc }, i) => (
                        <FadeIn key={title} delay={i * 70}>
                            <div className={styles.featureCard}>
                                <div className={styles.featureIcon}><Icon aria-hidden="true" /></div>
                                <div className={styles.featureTitle}>{title}</div>
                                <div className={styles.featureDesc}>{desc}</div>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>
        </div>
        
        {/* HOW IT WORKS */}
        <section className={styles.howitworks} id="how-it-works">
            <div className='wrap'>
                <FadeIn>
                    <div style={{ textAlign: 'center' }}>
                        <div className={styles.sectionLabel}>How it works</div>
                        <div className={styles.sectionTitle} style={{ marginBottom: 8 }}>Up and running in minutes</div>
                        <div className={styles.sectionSub} style={{ margin: '0 auto' }}>No developer needed. Anyone can set up a Storefindy widget in four simple steps.</div>
                    </div>
                </FadeIn>
                <div className={styles.stepsGrid}>
                    {steps.map(({ num, title, desc }, i) => (
                        <FadeIn key={num} delay={i * 80}>
                            <div className={styles.stepCard}>
                                <div className={styles.stepNum}>{num}</div>
                                <div className={styles.stepTitle}>{title}</div>
                                <div className={styles.stepDesc}>{desc}</div>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>

        {/* INTEGRATIONS / PLATFORMS */}
        <section className={styles.platforms} id="integrations">
            <div className='wrap'>
                <FadeIn>
                    <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
                        <div className={styles.sectionLabel}>Integrations</div>
                        <div className={styles.sectionTitle} style={{ marginBottom: 8 }}>Works with your platform — no developer needed</div>
                        <div className={styles.sectionSub} style={{ margin: '0 auto' }}>Storefindy embeds on any website in minutes. Choose the method that works best for you — a WordPress plugin, a script tag, a React component, or a custom branded subdomain.</div>
                    </div>
                </FadeIn>
                <div className={styles.platformsGrid}>
                    {platforms.map(({ key, icon: Icon, title, badge, desc, features, note, code, cta, ctaIcon, href, featured, comingSoon }, i) => {
                        const CtaIcon = ctaIcon || TbArrowRight;
                        return (
                            <FadeIn key={key} delay={i * 80}>
                                <div
                                    className={`${styles.platformCard} ${featured ? styles.featured : ''} ${comingSoon ? styles.comingSoon : ''}`}
                                >
                                    <div className={styles.platformTop}>
                                        <div className={styles.platformIcon}><Icon aria-hidden="true" /></div>
                                        <span className={`${styles.platformBadge} ${styles[badge.className]}`}>{badge.label}</span>
                                    </div>
                                    <div className={styles.platformTitle}>{title}</div>
                                    <div className={styles.platformDesc}>{desc}</div>
                                    {features && (
                                        <div className={styles.platformFeatures}>
                                            {features.map((f) => (
                                                <div className={styles.platformFeature} key={f}>
                                                    <TbCircleCheck aria-hidden="true" /> {f}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {code && <pre className={styles.platformCode}>{code}</pre>}
                                    {note && (
                                        <div className={styles.platformNote}>
                                            <TbStar aria-hidden="true" /> {note}
                                        </div>
                                    )}
                                    <Link
                                        href={href}
                                        className={`${styles.platformLink} ${comingSoon ? styles.muted : ''}`}
                                    >
                                        {cta} <CtaIcon aria-hidden="true" />
                                    </Link>
                                </div>
                            </FadeIn>
                        );
                    })}
                </div>

                {/* SUBDOMAIN CALLOUT */}
                <FadeIn>
                    <div className={styles.platformsFooter}>
                        <div className={styles.platformsFooterIcon}><TbWorld aria-hidden="true" /></div>
                        <div className={styles.platformsFooterBody}>
                            <div className={styles.platformsFooterTitle}>Don&apos;t have a website? Use a custom subdomain.</div>
                            <div className={styles.platformsFooterDesc}>Get a branded URL like <strong>yourbusiness.storefindy.com</strong> — a ready-made store locator page with your header, footer, and branding. No website needed.</div>
                        </div>
                        <div className={styles.platformsFooterActions}>
                            <a href="/dashboard/locators/subdomains" className="buttonBox secondary">Learn More</a>
                            <a href="/dashboard" className="buttonBox">Get Started Free</a>
                        </div>
                    </div>
                </FadeIn>
            </div>
        </section>

        <div className='wrap'>
            {/* PRICING */}
            <section className={styles.pricing} id="pricing">
                <FadeIn>
                    <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
                        <div className={styles.sectionLabel}>Pricing</div>
                        <div className={styles.sectionTitle}>Simple, honest pricing</div>
                        <div className={styles.sectionSub} style={{ margin: '0 auto' }}>Start free and stay free — or unlock advanced features as your business grows. No hidden fees, ever.</div>
                    </div>
                </FadeIn>
                <div className={styles.pricingGrid}>
                    {plans.map((plan, i) => (
                        <FadeIn key={plan.name} delay={i * 80}>
                            <div className={`${styles.pricingCard} ${plan.featured ? styles.featured : ''}`}>
                                {plan.badge && <div className={styles.pricingBadge}>{plan.badge}</div>}
                                <div className={styles.pricingName}>{plan.name}</div>
                                <div className={styles.pricingPrice}>{plan.price} <span>{plan.period}</span></div>
                                <div className={styles.pricingDesc}>{plan.desc}</div>
                                <div className={styles.pricingDivider}></div>
                                <div className={styles.pricingFeatures}>
                                    {plan.features.map((f, fi) => (
                                        <div className={`${styles.pricingFeature} ${f.ok ? '' : styles.no}`} key={fi}>
                                            {f.ok ? <TbCircleCheck aria-hidden="true" /> : <TbCircleX aria-hidden="true" />} {f.text}
                                        </div>
                                    ))}
                                </div>
                                <Link href="/dashboard/billing" className={`${styles.btnPricing} ${styles[plan.ctaClass]}`}>{plan.cta}</Link>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>
        </div>

            {/* TESTIMONIALS */}
        <section className={styles.testimonials} id="testimonials">
            <div className='wrap'>
                <FadeIn>
                    <div style={{ textAlign: 'center' }}>
                        <div className={styles.sectionLabel}>Testimonials</div>
                        <div className={styles.sectionTitle}>Businesses love Storefindy</div>
                        <div className={styles.sectionSub} style={{ margin: '0 auto' }}>Real feedback from real store owners who switched from expensive tools to Storefindy.</div>
                    </div>
                </FadeIn>
                <div className={styles.testimonialsGrid}>
                    {testimonials.map((t, i) => (
                        <FadeIn key={t.name} delay={i * 80}>
                            <div className={styles.testimonialCard}>
                                <div className={styles.testimonialStars}>
                                    {Array.from({ length: 5 }).map((_, si) => <TbStarFilled key={si} aria-hidden="true" />)}
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
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>

        <div className='wrap'>
            {/* FAQ */}
            <FaqHome />

            {/* CTA BANNER */}
            <FadeIn>
                <div className={styles.ctaBanner}>
                    <h2>Start finding your customers more stores — free</h2>
                    <p>Join hundreds of businesses already using Storefindy to help customers find their nearest store, branch, or outlet.</p>
                    <div className={styles.ctaBannerActions}>
                        <a href="/demo" className={`${styles.ctaButtonBox} ${styles.secondary}`}>See Our Live Demo</a>
                        <a href="/dashboard" className={styles.ctaButtonBox}>Create Your Free Locator</a>
                    </div>
                </div>
            </FadeIn>
        </div>
    </>);
}
