import styles from './PrivacyPolicy.module.scss';

export const metadata = {
    title: 'Privacy Policy | Storefindy',
    description:
        'How Storefindy collects, uses, and protects your information — including our use of cookies for authentication and analytics.',
};

const LAST_UPDATED = 'July 24, 2026';

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
];

const sections = [
    {
        id: 'overview',
        title: 'Overview',
        body: (
            <>
                <p>
                    This Privacy Policy explains how Storefindy (&quot;Storefindy&quot;, &quot;we&quot;, &quot;us&quot;, or
                    &quot;our&quot;) collects, uses, shares, and protects information in connection with the Storefindy website
                    at <a href="https://storefindy.com">storefindy.com</a>, the Storefindy dashboard, and the embeddable store
                    locator widget (together, the &quot;Service&quot;).
                </p>
                <p>
                    By using the Service, you agree to the practices described in this Policy. This Policy should be read
                    together with our <a href="/terms-of-service">Terms of Service</a>.
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
                        <strong>Account information</strong> — your name, email address, and password (stored securely) when
                        you register.
                    </li>
                    <li>
                        <strong>Store location data</strong> — the locations, addresses, coordinates, logos, and details you
                        add to your locators.
                    </li>
                    <li>
                        <strong>Billing information</strong> — where you subscribe to a paid plan, payment details are handled
                        by our payment processor; we do not store full card numbers.
                    </li>
                    <li>
                        <strong>Support communications</strong> — messages you send us when you request help.
                    </li>
                </ul>
                <h3>Information collected automatically</h3>
                <ul>
                    <li>
                        <strong>Usage &amp; device data</strong> — IP address, browser type, pages viewed, and similar log
                        data.
                    </li>
                    <li>
                        <strong>Cookies</strong> — see the <a href="#cookies">Cookies</a> section below.
                    </li>
                </ul>
                <h3>End-user data from the widget</h3>
                <p>
                    When you embed the widget, your website visitors may search by location or use browser geolocation to find
                    nearby stores. Location searches are processed to return results and are handled in accordance with this
                    Policy and the terms of our map providers.
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
                    <li>Process payments and manage subscriptions.</li>
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
            <p>
                We retain your information for as long as your account is active or as needed to provide the Service, comply
                with our legal obligations, resolve disputes, and enforce our agreements. When information is no longer needed,
                we take reasonable steps to delete or anonymize it.
            </p>
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
                        How Storefindy collects, uses, and protects your information — including our use of cookies for
                        authentication and analytics.
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
                            our store locator platform, why we collect it, and the choices you have — including how we use
                            cookies to keep you signed in and to improve the Service.
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
                        <a href="https://demo.storefindy.com" className={`${styles.ctaButtonBox} ${styles.secondary}`}>See Our Live Demo</a>
                        <a href="/dashboard" className={styles.ctaButtonBox}>Create Your Free Locator</a>
                    </div>
                </div>
            </div>
        </>
    );
}
