import styles from './TermsOfService.module.scss';

export const metadata = {
    title: 'Terms of Service | Storefindy',
    description:
        'The terms and conditions governing your use of Storefindy — the free, embeddable store locator widget for your website.',
};

const LAST_UPDATED = 'July 24, 2026';

const sections = [
    {
        id: 'acceptance',
        title: 'Acceptance of Terms',
        body: (
            <>
                <p>
                    These Terms of Service (the &quot;Terms&quot;) form a legally binding agreement between you
                    (&quot;you&quot;, &quot;your&quot;, or the &quot;Customer&quot;) and Storefindy (&quot;Storefindy&quot;,
                    &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) governing your access to and use of the Storefindy
                    website at <a href="https://storefindy.com">storefindy.com</a>, the Storefindy dashboard, the embeddable
                    store locator widget, and any related services (together, the &quot;Service&quot;).
                </p>
                <p>
                    By creating an account, embedding the widget on a website, or otherwise using the Service, you confirm
                    that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not
                    use the Service. If you are using the Service on behalf of a company or other organization, you represent
                    that you have the authority to bind that organization to these Terms.
                </p>
            </>
        ),
    },
    {
        id: 'service',
        title: 'Description of the Service',
        body: (
            <>
                <p>
                    Storefindy is a store locator platform that lets businesses add store, branch, or outlet locations and
                    embed an interactive &quot;find a store&quot; widget on their own website using a single line of code.
                    The Service includes, among other things:
                </p>
                <ul>
                    <li>A dashboard to create and manage one or more store locators.</li>
                    <li>Tools to add locations manually or import them in bulk via CSV file.</li>
                    <li>A visual customizer for colors, fonts, pin styles, map themes, and labels.</li>
                    <li>An embeddable widget powered by Leaflet.js and OpenStreetMap map tiles.</li>
                    <li>Search, filtering, and auto-detect-location features for your end users.</li>
                </ul>
                <p>
                    We may add, change, or remove features at any time. We continually improve the Service, and some
                    functionality may vary depending on your plan.
                </p>
            </>
        ),
    },
    {
        id: 'accounts',
        title: 'Eligibility & Accounts',
        body: (
            <>
                <p>
                    You must be at least 18 years old, or the age of legal majority in your jurisdiction, to use the Service.
                    To access most features you must register for an account and provide accurate, current, and complete
                    information.
                </p>
                <p>
                    You are responsible for safeguarding your account credentials and for all activity that occurs under your
                    account. You agree to notify us immediately of any unauthorized use of your account. We are not liable for
                    any loss or damage arising from your failure to protect your login information.
                </p>
            </>
        ),
    },
    {
        id: 'plans',
        title: 'Plans, Billing & Free Tier',
        body: (
            <>
                <p>
                    Storefindy offers a genuinely free plan for stores with 20 locations or fewer, with no time limit and no
                    credit card required. Paid plans (such as Pro and Business) unlock higher location limits and additional
                    features.
                </p>
                <ul>
                    <li>
                        <strong>Fees.</strong> Paid plans are billed in advance on a recurring basis (monthly or annually)
                        until cancelled. All fees are stated exclusive of taxes unless noted otherwise.
                    </li>
                    <li>
                        <strong>Renewals.</strong> Subscriptions renew automatically at the end of each billing period unless
                        you cancel before the renewal date.
                    </li>
                    <li>
                        <strong>Cancellation.</strong> You may cancel at any time from your dashboard. Cancellation stops
                        future charges; your paid features remain available until the end of the current billing period.
                    </li>
                    <li>
                        <strong>Downgrades.</strong> If you downgrade or your paid plan ends and your data exceeds free-tier
                        limits, some locations or features may become unavailable until you are within the applicable limit.
                    </li>
                    <li>
                        <strong>Refunds.</strong> Except where required by law, fees are non-refundable.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: 'acceptable-use',
        title: 'Acceptable Use',
        body: (
            <>
                <p>You agree not to use the Service to, and not to allow anyone to:</p>
                <ul>
                    <li>Violate any applicable law, regulation, or third-party right.</li>
                    <li>Upload location data or content you do not have the right to use.</li>
                    <li>
                        Upload or display content that is unlawful, misleading, fraudulent, defamatory, obscene, or harmful.
                    </li>
                    <li>
                        Interfere with, disrupt, overload, or attempt to gain unauthorized access to the Service or its
                        related systems, or circumvent plan limits, rate limits, or security measures.
                    </li>
                    <li>
                        Reverse engineer, decompile, resell, sublicense, or create a competing product from the Service,
                        except as permitted by law.
                    </li>
                    <li>
                        Misuse the underlying map providers, including OpenStreetMap tiles, in violation of their usage
                        policies.
                    </li>
                </ul>
                <p>
                    We may suspend or terminate access if we reasonably believe you have violated this section or created risk
                    or legal exposure for Storefindy.
                </p>
            </>
        ),
    },
    {
        id: 'your-content',
        title: 'Your Content & Location Data',
        body: (
            <>
                <p>
                    &quot;Your Content&quot; means the store locations, addresses, coordinates, logos, text, images, and other
                    data you add to the Service. As between you and Storefindy, <strong>you retain all ownership of Your
                    Content</strong>.
                </p>
                <p>
                    You grant Storefindy a worldwide, non-exclusive, royalty-free license to host, store, process, reproduce,
                    and display Your Content solely as necessary to operate and provide the Service — including rendering your
                    locations in the embedded widget on the websites where you install it.
                </p>
                <p>
                    You are solely responsible for the accuracy, legality, and appropriateness of Your Content and for having
                    all rights and consents required to submit it and display it publicly through the widget.
                </p>
            </>
        ),
    },
    {
        id: 'widget-third-party',
        title: 'Widget Embedding & Third-Party Services',
        body: (
            <>
                <p>
                    The Service lets you embed a widget on websites you control by adding a script tag. You are responsible
                    for the websites where you install the widget and for compliance with any platform terms (such as
                    WordPress, Shopify, Wix, Squarespace, or Webflow).
                </p>
                <p>
                    The widget relies on third-party services, including <strong>Leaflet.js</strong> and{' '}
                    <strong>OpenStreetMap</strong> for maps and map tiles, and may rely on browser geolocation for
                    auto-detect features. Your and your end users&apos; use of those services is subject to their respective
                    terms and policies. Storefindy does not control and is not responsible for third-party services.
                </p>
            </>
        ),
    },
    {
        id: 'ip',
        title: 'Intellectual Property',
        body: (
            <>
                <p>
                    The Service, including the dashboard, widget code, software, designs, logos, and the Storefindy name and
                    brand, is owned by Storefindy and its licensors and is protected by intellectual property laws. Except for
                    the rights expressly granted to you in these Terms, we reserve all rights.
                </p>
                <p>
                    Subject to your compliance with these Terms and payment of any applicable fees, we grant you a limited,
                    non-exclusive, non-transferable, revocable license to use the Service and embed the widget for your own
                    business purposes. Free-plan widgets may display Storefindy branding; eligible paid plans may remove it.
                </p>
            </>
        ),
    },
    {
        id: 'privacy',
        title: 'Privacy',
        body: (
            <>
                <p>
                    Our handling of personal data is described in our{' '}
                    <a href="/privacy-policy">Privacy Policy</a>, which is incorporated into these Terms by reference. By using
                    the Service, you consent to the collection and use of information as described there.
                </p>
                <p>
                    Where you use the Service to process personal data of your end users (for example, through geolocation
                    features), you are responsible for providing any required notices and obtaining any required consents.
                </p>
            </>
        ),
    },
    {
        id: 'availability',
        title: 'Service Availability & Changes',
        body: (
            <>
                <p>
                    We work to keep the Service available and reliable, but we do not guarantee that it will be uninterrupted,
                    error-free, or secure. The Service may be temporarily unavailable for maintenance, updates, or reasons
                    beyond our control.
                </p>
                <p>
                    We may modify, suspend, or discontinue any part of the Service at any time. Where a change materially
                    reduces core functionality of a paid plan, we will make reasonable efforts to notify affected customers.
                </p>
            </>
        ),
    },
    {
        id: 'termination',
        title: 'Termination',
        body: (
            <>
                <p>
                    You may stop using the Service and delete your account at any time. We may suspend or terminate your access
                    if you breach these Terms, fail to pay fees, or use the Service in a way that creates legal risk or harm to
                    us or others.
                </p>
                <p>
                    Upon termination, your right to use the Service ends and embedded widgets may stop functioning. We may
                    delete Your Content after termination in accordance with our data-retention practices. Sections that by
                    their nature should survive termination will survive.
                </p>
            </>
        ),
    },
    {
        id: 'disclaimers',
        title: 'Disclaimers',
        body: (
            <>
                <p>
                    The Service is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong>{' '}
                    without warranties of any kind, whether express, implied, or statutory, including any implied warranties of
                    merchantability, fitness for a particular purpose, title, and non-infringement.
                </p>
                <p>
                    Storefindy does not warrant that map data, location results, distances, or directions are accurate,
                    complete, or up to date, and you should not rely on the Service for any purpose where such reliance could
                    lead to injury, loss, or damage.
                </p>
            </>
        ),
    },
    {
        id: 'liability',
        title: 'Limitation of Liability',
        body: (
            <>
                <p>
                    To the maximum extent permitted by law, Storefindy and its affiliates, officers, employees, and suppliers
                    will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any
                    loss of profits, revenue, data, or goodwill, arising out of or related to your use of the Service.
                </p>
                <p>
                    Our total aggregate liability arising out of or related to the Service will not exceed the greater of
                    (a) the total fees you paid to Storefindy in the twelve (12) months before the event giving rise to the
                    claim, or (b) fifty US dollars (US$50).
                </p>
            </>
        ),
    },
    {
        id: 'indemnification',
        title: 'Indemnification',
        body: (
            <p>
                You agree to indemnify and hold harmless Storefindy and its affiliates from and against any claims, damages,
                liabilities, losses, and expenses (including reasonable legal fees) arising out of or related to Your Content,
                your use of the Service, your websites, or your violation of these Terms or any applicable law or third-party
                right.
            </p>
        ),
    },
    {
        id: 'governing-law',
        title: 'Governing Law & Disputes',
        body: (
            <p>
                These Terms are governed by the laws applicable at Storefindy&apos;s principal place of business, without
                regard to conflict-of-law rules. You agree to first attempt to resolve any dispute informally by contacting
                us. Any dispute that cannot be resolved informally will be subject to the exclusive jurisdiction of the courts
                located there, except where applicable law grants you rights in your local courts.
            </p>
        ),
    },
    {
        id: 'changes',
        title: 'Changes to These Terms',
        body: (
            <p>
                We may update these Terms from time to time. When we make material changes, we will update the &quot;Last
                updated&quot; date above and, where appropriate, provide additional notice. Your continued use of the Service
                after changes take effect constitutes your acceptance of the revised Terms.
            </p>
        ),
    },
];

export default function TermsOfService() {
    return (
        <>
            <div className="wrap">
                <section className={styles.hero}>
                    <div className={styles.label}>Legal</div>
                    <h1 className={styles.title}>Terms of Service</h1>
                    <p className={styles.subtitle}>
                        The terms and conditions that govern your use of Storefindy — the free, embeddable store locator
                        widget for your website.
                    </p>
                    <div className={styles.updated}>Last updated: {LAST_UPDATED}</div>
                </section>

                <div className={styles.body}>
                    <aside className={styles.toc}>
                        <div className={styles.tocTitle}>On this page</div>
                        <ol className={styles.tocList}>
                            {sections.map((s) => (
                                <li key={s.id}>
                                    <a href={`#${s.id}`}>{s.title}</a>
                                </li>
                            ))}
                        </ol>
                    </aside>

                    <div className={styles.content}>
                        <p className={styles.intro}>
                            Welcome to Storefindy. Please read these Terms carefully before using our store locator platform.
                            They explain what you can expect from us and what we expect from you when you create locators, add
                            store locations, and embed the widget on your website.
                        </p>

                        {sections.map((s, i) => (
                            <section id={s.id} key={s.id} className={styles.section}>
                                <h2 className={styles.sectionHeading}>
                                    <span>{i + 1}</span>
                                    {s.title}
                                </h2>
                                {s.body}
                            </section>
                        ))}

                        <div className={styles.contactCard}>
                            <h2 className={styles.sectionHeading} style={{ fontSize: 20 }}>
                                Contact Us
                            </h2>
                            <p>
                                If you have any questions about these Terms of Service, please reach out and we&apos;ll be
                                happy to help.
                            </p>
                            <p>
                                <strong>Email:</strong>{' '}
                                <a href="mailto:support@storefindy.com">support@storefindy.com</a>
                            </p>
                            <p>
                                <strong>Website:</strong> <a href="https://storefindy.com">storefindy.com</a>
                            </p>
                        </div>
                    </div>
                </div>

                <div className={styles.ctaBanner}>
                    <h2>Ready to help customers find your stores?</h2>
                    <p>Create your free store locator in minutes — no credit card, no developer, no complexity.</p>
                    <div className={styles.ctaBannerActions}>
                        <a href="https://demo.storefindy.com" className={`${styles.ctaButtonBox} ${styles.secondary}`}>See Our Live Demo</a>
                        <a href="/dashboard" className={styles.ctaButtonBox}>Create Your Free Locator</a>
                    </div>
                </div>
            </div>
        </>
    );
}
