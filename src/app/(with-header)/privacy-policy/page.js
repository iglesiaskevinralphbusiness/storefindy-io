import styles from './PrivacyPolicy.module.scss';
import { buildSocialMetadata } from '@/utils/constant/seo';

const pageTitle = 'Privacy Policy';
const pageDescription =
    'How Storefindy collects, uses, and protects your information across storefindy.com, the Shopify app, the WordPress plugin, and the store locator widget.';

export const metadata = {
    title: pageTitle,
    description: pageDescription,
    ...buildSocialMetadata({ title: `${pageTitle} | Storefindy`, description: pageDescription, path: '/privacy-policy' }),
};

const LAST_UPDATED = 'August 25, 2026';

const cookies = [
    {
        name: 'Session / authentication',
        provider: 'Storefindy (NextAuth.js)',
        purpose:
            'Keeps you securely signed in to your dashboard and protects against cross-site request forgery. Strictly necessary — the Service cannot work without them.',
        duration: 'Session / up to 30 days',
    },
    {
        name: 'Preferences',
        provider: 'Storefindy',
        purpose:
            'Remembers basic settings such as your interface choices so your experience is consistent between visits.',
        duration: 'Up to 1 year',
    },
    {
        name: 'Analytics',
        provider: 'Third-party analytics',
        purpose:
            'Helps us understand how the Service is used so we can improve it. These are optional and only set where permitted.',
        duration: 'Up to 2 years',
    },
    {
        name: 'Shopify session token (not a cookie)',
        provider: 'Shopify App Bridge',
        purpose:
            'The Shopify app authenticates inside the Shopify admin with short-lived session tokens. It does not rely on third-party cookies or local storage for sign-in.',
        duration: 'Minutes (refreshed while the admin is open)',
    },
    {
        name: 'WordPress admin session',
        provider: 'WordPress',
        purpose:
            'The WordPress plugin runs inside your existing WordPress admin. WordPress’s own login cookies keep you signed in there. Storefindy does not set a separate login cookie.',
        duration: 'Controlled by your WordPress site',
    },
];

const sections = [
    {
        id: 'overview',
        title: 'Overview',
        body: (
            <>
                <p>
                    This Privacy Policy explains how Storefindy (&quot;Storefindy&quot;, &quot;we&quot;, &quot;us&quot;, or
                    &quot;our&quot;) collects, uses, shares, and protects information in connection with:
                </p>
                <ul>
                    <li>
                        the Storefindy website at <a href="https://storefindy.com">storefindy.com</a> and its dashboard;
                    </li>
                    <li>the embeddable store locator widget on any website;</li>
                    <li>
                        <strong>Storefindy Store Locator for Shopify</strong>, the embedded app at{' '}
                        <a href="https://app.storefindy.com">app.storefindy.com</a> and in the Shopify App Store;
                    </li>
                    <li>
                        the <strong>Storefindy Store Locator</strong> WordPress plugin, which manages locators from the
                        WordPress admin and embeds the widget via a block or shortcode.
                    </li>
                </ul>
                <p>
                    Together these are the &quot;Service&quot;. By using the Service, you agree to the practices described in
                    this Policy. This Policy should be read together with our{' '}
                    <a href="/terms-of-service">Terms of Service</a>.
                </p>
                <p>
                    If you installed Storefindy from the Shopify App Store, this is the privacy policy URL for that listing.
                    Shopify merchants should also read the sections{' '}
                    <a href="#shopify-app">Storefindy for Shopify</a> and <a href="#end-users">Shoppers (end users)</a>.
                </p>
            </>
        ),
    },
    {
        id: 'information-we-collect',
        title: 'Information We Collect',
        body: (
            <>
                <h3>Information you provide</h3>
                <ul>
                    <li>
                        <strong>Account information</strong> — on storefindy.com, your name, email address, and sign-in
                        credentials (or OAuth identity from Google, GitHub, or Microsoft). The Shopify app does not create a
                        separate Storefindy password; Shopify identifies the shop. The WordPress plugin uses your existing
                        WordPress admin login.
                    </li>
                    <li>
                        <strong>Store location data</strong> — locations, addresses, coordinates, hours, contact details,
                        icons, and notes you add to your locators.
                    </li>
                    <li>
                        <strong>Billing information</strong> — we do not store full card numbers. On storefindy.com, payments
                        are handled by our payment processor (Lemon Squeezy). On Shopify, charges go through the{' '}
                        <strong>Shopify Billing API</strong> and appear on the merchant&apos;s Shopify invoice.
                    </li>
                    <li>
                        <strong>Support communications</strong> — messages, bug reports, and screenshots you send us.
                    </li>
                    <li>
                        <strong>WordPress API key</strong> — if you use the WordPress plugin, you paste a Storefindy API key
                        into WordPress. That key is stored in your WordPress database so the plugin can call our API. Location
                        records themselves are not copied into WordPress.
                    </li>
                </ul>
                <h3>Information collected automatically</h3>
                <ul>
                    <li>
                        <strong>Usage &amp; device data</strong> — IP address, browser type, pages viewed, and similar log
                        data when you use storefindy.com.
                    </li>
                    <li>
                        <strong>Cookies and session tokens</strong> — see the <a href="#cookies">Cookies</a> section below.
                    </li>
                    <li>
                        <strong>Shopify shop profile</strong> — when you install the Shopify app we receive the shop&apos;s
                        permanent <code>*.myshopify.com</code> domain, shop name, primary domain, contact email Shopify
                        exposes, country, currency, timezone, and Shopify plan. We store an offline access token (and refresh
                        token) so we can create a Store Locator page, read whether the app embed is enabled, and keep locator
                        names in sync with the theme editor dropdown.
                    </li>
                </ul>
                <h3>End-user data from the widget</h3>
                <p>
                    When you embed the widget — on any site, a Shopify theme, or a WordPress page — visitors may search by
                    location or use browser geolocation to find nearby stores. Searches are processed to return results and
                    are handled in accordance with this Policy and the terms of our map providers.
                </p>
                <p>
                    We may store <strong>aggregate locator analytics</strong> such as view counts, search counts, searched
                    cities or countries, device type, and peak hours. These tallies are not tied to a shopper&apos;s name,
                    email, Shopify customer id, or other personal identifier. We do not build a profile of an individual
                    visitor.
                </p>
            </>
        ),
    },
    {
        id: 'how-we-use',
        title: 'How We Use Information',
        body: (
            <>
                <p>We use the information we collect to:</p>
                <ul>
                    <li>Provide, operate, and maintain the Service and your store locators.</li>
                    <li>Authenticate you and keep your account secure.</li>
                    <li>Process payments and manage subscriptions (Lemon Squeezy on the website; Shopify Billing in the Shopify app).</li>
                    <li>Install and operate the Shopify app and WordPress plugin on your store or site.</li>
                    <li>Respond to your requests and provide customer support.</li>
                    <li>Understand usage and improve the Service.</li>
                    <li>Detect, prevent, and address abuse, fraud, or security issues.</li>
                    <li>Comply with legal obligations.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'cookies',
        title: 'Cookies',
        body: (
            <>
                <p>
                    Cookies are small text files stored on your device. We use cookies and similar technologies to run the
                    Service, keep you signed in, remember your preferences, and understand how the Service is used.
                </p>
                <p>
                    In particular, Storefindy uses <strong>NextAuth.js</strong> for authentication, which relies on{' '}
                    <strong>strictly necessary session cookies</strong> to keep you logged in and to protect your account.
                    Because these cookies are essential to the Service, they cannot be disabled while you use your dashboard.
                    We may also use optional analytics cookies to improve the product.
                </p>
                <p>
                    The <strong>Shopify app</strong> does not use cookies to keep you signed in. Shopify App Bridge issues a
                    session token for each request. The <strong>WordPress plugin</strong> uses WordPress&apos;s own admin
                    session; Storefindy does not add a second login cookie.
                </p>
                <div className={styles.tableWrap}>
                    <table className={styles.cookieTable}>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Provider</th>
                                <th>Purpose</th>
                                <th>Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cookies.map((c) => (
                                <tr key={c.name}>
                                    <td>{c.name}</td>
                                    <td>{c.provider}</td>
                                    <td>{c.purpose}</td>
                                    <td>{c.duration}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p>
                    You can control or delete cookies through your browser settings. Blocking strictly necessary cookies may
                    prevent you from signing in or using parts of the Service.
                </p>
            </>
        ),
    },
    {
        id: 'sharing',
        title: 'How We Share Information',
        body: (
            <>
                <p>
                    We do not sell your personal information. We share information only in the following limited
                    circumstances:
                </p>
                <ul>
                    <li>
                        <strong>Service providers</strong> — trusted vendors who help us run the Service (for example,
                        hosting, payment processing, email, and analytics), bound by confidentiality obligations.
                    </li>
                    <li>
                        <strong>Shopify</strong> — if you use the Shopify app, Shopify is the platform that authenticates the
                        shop, collects app subscription fees, and hosts your theme. We send Shopify only what the Admin API
                        needs (for example creating a Store Locator page or locator metaobjects). Shopify&apos;s own privacy
                        terms apply to data Shopify holds as the commerce platform.
                    </li>
                    <li>
                        <strong>Your WordPress site</strong> — if you use the plugin, your WordPress installation stores the
                        API key and serves the pages where the widget is embedded. We do not host your WordPress site.
                    </li>
                    <li>
                        <strong>Map providers</strong> — location searches rely on Leaflet.js and OpenStreetMap tiles, subject
                        to their policies.
                    </li>
                    <li>
                        <strong>Legal reasons</strong> — where required by law, regulation, legal process, or to protect
                        rights, safety, and the integrity of the Service.
                    </li>
                    <li>
                        <strong>Business transfers</strong> — in connection with a merger, acquisition, or sale of assets,
                        subject to this Policy.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: 'retention',
        title: 'Data Retention',
        body: (
            <>
                <p>
                    We retain your information for as long as your account is active or as needed to provide the Service, comply
                    with our legal obligations, resolve disputes, and enforce our agreements. When information is no longer needed,
                    we take reasonable steps to delete or anonymize it.
                </p>
                <ul>
                    <li>
                        <strong>storefindy.com</strong> — deleting your account removes associated locators and locations
                        according to our retention practices.
                    </li>
                    <li>
                        <strong>Shopify</strong> — if you uninstall the app, we stop using the shop&apos;s access token. When
                        Shopify sends the mandatory <code>shop/redact</code> webhook, we erase that shop&apos;s Storefindy
                        records (shop profile, locators, locations, hosted-page data). The <code>customers/data_request</code>{' '}
                        and <code>customers/redact</code> webhooks are acknowledged; we do not store shopper-identifying
                        customer records to export or erase.
                    </li>
                    <li>
                        <strong>WordPress</strong> — uninstalling the plugin deletes the stored API key and plugin transients
                        from your WordPress database. Your locators on Storefindy remain until you delete them in the
                        Storefindy dashboard.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: 'security',
        title: 'Security',
        body: (
            <p>
                We use reasonable technical and organizational measures to protect your information, including encryption in
                transit and secure handling of credentials. However, no method of transmission or storage is completely
                secure, and we cannot guarantee absolute security.
            </p>
        ),
    },
    {
        id: 'your-rights',
        title: 'Your Rights & Choices',
        body: (
            <>
                <p>
                    Depending on where you live, you may have rights over your personal information, including the right to
                    access, correct, delete, or export it, and to object to or restrict certain processing. To exercise these
                    rights, contact us using the details below.
                </p>
                <ul>
                    <li>Update most account information directly from your dashboard.</li>
                    <li>Delete your account at any time, which removes associated data per our retention practices.</li>
                    <li>Manage cookies through your browser settings.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'international',
        title: 'International Data Transfers',
        body: (
            <p>
                Storefindy operates globally, and your information may be processed in countries other than your own. Where we
                transfer information across borders, we take steps to ensure it receives an appropriate level of protection in
                accordance with applicable law.
            </p>
        ),
    },
    {
        id: 'children',
        title: "Children's Privacy",
        body: (
            <p>
                The Service is not directed to children under 16, and we do not knowingly collect personal information from
                them. If you believe a child has provided us with personal information, please contact us and we will take
                appropriate steps to delete it.
            </p>
        ),
    },
    {
        id: 'shopify-app',
        title: 'Storefindy for Shopify',
        body: (
            <>
                <p>
                    Storefindy Store Locator for Shopify is an embedded app. You install it from the Shopify App Store or
                    Shopify admin. Shopify handles installation and permission screens. We never ask you to type your{' '}
                    <code>myshopify.com</code> domain into a form on our site.
                </p>
                <p>In addition to the data described above, the Shopify app specifically:</p>
                <ul>
                    <li>
                        Authenticates with <strong>Shopify session tokens</strong> (App Bridge). We do not use third-party
                        cookies or local storage as the session.
                    </li>
                    <li>
                        Stores the shop domain, a limited shop profile, and an offline access token so the app can create a
                        Store Locator page, check the theme app embed, and sync locator names into Shopify metaobjects (the
                        theme editor&apos;s Locator dropdown).
                    </li>
                    <li>
                        Charges paid plans through the <strong>Shopify Billing API</strong> only. We do not collect card
                        numbers or bill you on a separate website for the Shopify app.
                    </li>
                    <li>
                        May record aggregate map analytics (views, searches, cities, devices). These are not linked to an
                        individual shopper or Shopify customer.
                    </li>
                    <li>
                        Honors Shopify&apos;s mandatory compliance webhooks: customer data request, customer deletion, and
                        shop deletion, as described under <a href="#retention">Data Retention</a>.
                    </li>
                </ul>
                <p>
                    The storefront map is added with a <strong>theme app extension</strong> (app embed and app block). We do
                    not ask you to paste scripts into your theme files.
                </p>
            </>
        ),
    },
    {
        id: 'wordpress-plugin',
        title: 'Storefindy WordPress plugin',
        body: (
            <>
                <p>
                    The Storefindy Store Locator plugin lets you manage locators and locations from the WordPress admin and
                    place the map with the Store Locator block or the <code>[storefindy_locator]</code> shortcode.
                </p>
                <ul>
                    <li>
                        You connect the plugin with a <strong>Storefindy API key</strong>. WordPress stores only that key
                        (plus short-lived cache/transients). Locator and location records stay on Storefindy&apos;s servers
                        and are loaded through <code>https://www.storefindy.com/api/v1</code>.
                    </li>
                    <li>
                        Admin actions (create location, CSV import, publish) are performed by users who already have the
                        WordPress <code>manage_options</code> capability.
                    </li>
                    <li>
                        The public map is the same Storefindy widget used on other sites. Shopper searches follow the{' '}
                        <a href="#end-users">Shoppers</a> section.
                    </li>
                    <li>
                        Uninstalling the plugin removes the API key and plugin options from WordPress. It does not delete your
                        Storefindy account or locators unless you delete them in the Storefindy dashboard.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: 'end-users',
        title: 'Shoppers (end users)',
        body: (
            <>
                <p>
                    If you visit a merchant&apos;s website, Shopify store, or WordPress site that uses Storefindy, you may
                    search for nearby stores or allow the browser to share your location for that search. That request is used
                    to return map results. We do not use it to identify you as a person, and we do not sell shopper data.
                </p>
                <p>
                    Geolocation, when you allow it, is processed in the browser and sent as coordinates for that search only.
                    Map tiles come from OpenStreetMap (via Leaflet), subject to their policies.
                </p>
            </>
        ),
    },
    {
        id: 'changes',
        title: 'Changes to This Policy',
        body: (
            <p>
                We may update this Privacy Policy from time to time. When we make material changes, we will update the
                &quot;Last updated&quot; date above and, where appropriate, provide additional notice. Your continued use of
                the Service after changes take effect constitutes your acceptance of the revised Policy.
            </p>
        ),
    },
];

export default function PrivacyPolicy() {
    return (
        <>
            <div className="wrap">
                <section className={styles.hero}>
                    <div className={styles.label}>Legal</div>
                    <h1 className={styles.title}>Privacy Policy</h1>
                    <p className={styles.subtitle}>
                        How Storefindy collects, uses, and protects your information across storefindy.com, the Shopify app,
                        the WordPress plugin, and the store locator widget.
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
                            Your privacy matters to us. This Policy explains what information Storefindy collects when you use
                            storefindy.com, Storefindy for Shopify, the WordPress plugin, and the store locator widget — why
                            we collect it, and the choices you have.
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
                                If you have any questions about this Privacy Policy or how we handle your information, please
                                reach out and we&apos;ll be happy to help.
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
                        <a href="/demo" className={`${styles.ctaButtonBox} ${styles.secondary}`}>See Our Live Demo</a>
                        <a href="/dashboard" className={styles.ctaButtonBox}>Create Your Free Locator</a>
                    </div>
                </div>
            </div>
        </>
    );
}
