import {
    TbMail,
    TbMessageCircle,
    TbBook2,
    TbBrandX,
    TbClock,
    TbMapPin,
} from 'react-icons/tb';
import ContactForm from './ContactForm';
import styles from './ContactUs.module.scss';

export const metadata = {
    title: 'Contact Us | Storefindy',
    description:
        'Questions about Storefindy? Reach out to our team for sales, support, billing, or partnerships. We typically reply within 1 business day.',
};

const methods = [
    {
        icon: TbMail,
        title: 'Email us',
        desc: 'Best for detailed questions. We read every message.',
        action: 'support@storefindy.com',
        href: 'mailto:support@storefindy.com',
    },
    {
        icon: TbMessageCircle,
        title: 'Sales & demos',
        desc: 'Want a walkthrough before you commit? Let’s talk.',
        action: 'See the live demo',
        href: 'https://demo.storefindy.com',
    },
    {
        icon: TbBook2,
        title: 'Documentation',
        desc: 'Setup guides and answers to the most common questions.',
        action: 'Browse the docs',
        href: '/dashboard/documentation',
    },
    {
        icon: TbBrandX,
        title: 'Social',
        desc: 'Follow along for product updates and quick tips.',
        action: '@storefindy',
        href: 'https://x.com/storefindy',
    },
];

const details = [
    { icon: TbClock, label: 'Response time', value: 'Within 1 business day' },
    { icon: TbMail, label: 'General inquiries', value: 'support@storefindy.com' },
    { icon: TbMapPin, label: 'Support hours', value: 'Mon–Fri, 9am–6pm' },
];

const faqs = [
    {
        q: 'How quickly will I hear back?',
        a: 'We reply to most messages within one business day. Sales and billing questions are usually answered even faster.',
    },
    {
        q: 'Do I need an account to get help?',
        a: 'No. Anyone can reach out using the form above — whether you’re a current customer or just exploring Storefindy.',
    },
    {
        q: 'Where do I report a bug?',
        a: 'If you already have an account, the fastest path is the "Report a bug" tool inside your dashboard. Otherwise, use the form above and pick "Technical support".',
    },
    {
        q: 'Can I request a feature?',
        a: 'Absolutely — we love hearing what would make Storefindy better. Choose "Product feedback" in the topic dropdown and tell us what you have in mind.',
    },
];

export default function ContactUs() {
    return (
        <>
            {/* HERO */}
            <section className={styles.hero}>
                <div className="wrap">
                    <div className={styles.label}>Contact Us</div>
                    <h1 className={styles.title}>We&apos;d love to hear from you</h1>
                    <p className={styles.subtitle}>
                        Whether you have a question about features, pricing, need a demo, or just want to say hello —
                        our team is ready to help.
                    </p>
                </div>
            </section>

            {/* CONTACT METHODS */}
            <div className="wrap">
                <section className={styles.methods}>
                    <div className={styles.methodsGrid}>
                        {methods.map(({ icon: Icon, title, desc, action, href }) => (
                            <a
                                className={styles.methodCard}
                                key={title}
                                href={href}
                                target={href.startsWith('http') ? '_blank' : undefined}
                                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            >
                                <div className={styles.methodIcon}>
                                    <Icon aria-hidden="true" />
                                </div>
                                <div className={styles.methodTitle}>{title}</div>
                                <div className={styles.methodDesc}>{desc}</div>
                                <div className={styles.methodAction}>{action}</div>
                            </a>
                        ))}
                    </div>
                </section>
            </div>

            {/* FORM + SIDEBAR */}
            <section className={styles.formSection}>
                <div className="wrap">
                    <div className={styles.formLayout}>
                        <div className={styles.formCard}>
                            <div className={styles.sectionLabel}>Send a message</div>
                            <div className={styles.formHeading}>Tell us how we can help</div>
                            <p className={styles.formSub}>
                                Fill out the form and the right person on our team will get back to you.
                            </p>
                            <ContactForm />
                        </div>

                        <aside className={styles.sidebar}>
                            <div className={styles.sidebarTitle}>Other ways to reach us</div>
                            <ul className={styles.detailList}>
                                {details.map(({ icon: Icon, label, value }) => (
                                    <li className={styles.detailItem} key={label}>
                                        <div className={styles.detailIcon}>
                                            <Icon aria-hidden="true" />
                                        </div>
                                        <div>
                                            <div className={styles.detailLabel}>{label}</div>
                                            <div className={styles.detailValue}>{value}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <div className={styles.sidebarNote}>
                                Prefer email? Write to us directly at{' '}
                                <a href="mailto:hello@storefindy.com">hello@storefindy.com</a> and we&apos;ll take it
                                from there.
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className={styles.faq}>
                <div className="wrap">
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>FAQ</div>
                        <div className={styles.sectionTitle}>Before you reach out</div>
                        <div className={styles.sectionSub}>
                            A few quick answers to the questions we hear most often.
                        </div>
                    </div>
                    <div className={styles.faqGrid}>
                        {faqs.map(({ q, a }) => (
                            <div className={styles.faqCard} key={q}>
                                <div className={styles.faqQuestion}>{q}</div>
                                <div className={styles.faqAnswer}>{a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA BANNER */}
            <div className="wrap">
                <div className={styles.ctaBanner}>
                    <h2>Ready to get started?</h2>
                    <p>
                        You don&apos;t have to wait for a reply to try Storefindy. Create your first store locator for
                        free — no credit card required.
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
