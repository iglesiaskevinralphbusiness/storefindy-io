'use client';
import { useEffect, useMemo, useRef, useState, useActionState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { submitSupportTicket, getSupportContext } from '@/actions/support';
import { RiArrowRightLine } from 'react-icons/ri';
import {
    TbLifebuoy,
    TbSearch,
    TbMail,
    TbBook,
    TbHeadset,
    TbCategory,
    TbRocket,
    TbMap,
    TbMapPin,
    TbCode,
    TbCreditCard,
    TbPalette,
    TbChevronRight,
    TbMessageQuestion,
    TbPlus,
    TbSend,
    TbInfoCircle,
    TbActivityHeartbeat,
    TbExternalLink,
    TbTrendingUp,
    TbEye,
    TbArrowRight,
    TbHistory,
    TbCircleCheck,
} from 'react-icons/tb';

// Topics link straight into the documentation page anchors.
const TOPICS = [
    { icon: <TbRocket />, tone: 'yellow', text: 'Getting Started', sub: 'Setup & first steps', href: '/dashboard/documentation#getting-started' },
    { icon: <TbMap />, tone: 'blue', text: 'Locators', sub: 'Create & manage', href: '/dashboard/documentation#locators' },
    { icon: <TbMapPin />, tone: 'green', text: 'Locations', sub: 'Add & import stores', href: '/dashboard/documentation#locations' },
    { icon: <TbCode />, tone: 'purple', text: 'Embed & Subdomain', sub: 'Install on website', href: '/dashboard/documentation#embed' },
    { icon: <TbCreditCard />, tone: 'orange', text: 'Billing & Plans', sub: 'Payments & upgrades', href: '/dashboard/documentation#billing' },
    { icon: <TbPalette />, tone: 'sky', text: 'Customization', sub: 'Colors, fonts & pins', href: '/dashboard/documentation#customize' },
];

// FAQ — reuses the documentation answers plus a few troubleshooting ones from
// the support knowledge base. `keywords` powers the hero search.
const FAQS = [
    {
        q: 'How do I embed the store locator on my website?',
        keywords: 'embed widget code install website wordpress shopify wix html script',
        a: (
            <>Copy the two-line snippet from <strong>Locator → Embed Locator</strong> — a{' '}
                <code>&lt;locator-widget&gt;</code> tag plus the Storefindy script — and paste it where you want the map to
                appear. It works on any site: WordPress, Shopify, Wix, or plain HTML. We also provide framework snippets for
                React, Vue, and Angular.</>
        ),
    },
    {
        q: 'How do I bulk import store locations via CSV?',
        keywords: 'csv import locations bulk upload template columns',
        a: (
            <>Go to <strong>Locations → Import CSV</strong> and download the template first. Required columns are{' '}
                <code>name</code>, <code>city</code>, <code>state</code>, <code>country</code>, <code>lat</code>,{' '}
                <code>lng</code>; optional are <code>phone</code>, <code>email</code>, <code>website</code>. Files must be
                .csv and under 5&nbsp;MB. Upload, follow the 4-step wizard to map fields, and preview before importing.</>
        ),
    },
    {
        q: 'What is a custom subdomain and how do I set one up?',
        keywords: 'subdomain custom url branded page hosted',
        a: (
            <>A custom subdomain gives your locator a branded URL like <code>yourbrand.storefindy.com</code>. Go to{' '}
                <strong>Locator → Custom Subdomains</strong>, enter a name (3–30 lowercase letters, numbers, or hyphens),
                assign it to a locator, and create it. The page goes live immediately, and you can add custom header/footer
                HTML to match your brand.</>
        ),
    },
    {
        q: 'What are the limits on the Free plan?',
        keywords: 'free plan limit locator locations subdomain upgrade pricing',
        a: (
            <>The Free plan includes 1 locator, up to 20 locations, 1 custom subdomain, basic customization, and CSV import.
                Upgrade to <strong>Pro</strong> ($10/mo) or <strong>Business</strong> ($30/mo) from your Billing page for more
                locators and locations, analytics, and to remove Storefindy branding.</>
        ),
    },
    {
        q: 'How do I cancel or downgrade my subscription?',
        keywords: 'cancel subscription downgrade billing plan lemonsqueezy refund',
        a: (
            <>Open <strong>Account → Billing</strong> and launch the billing portal (Lemon Squeezy) to cancel or downgrade.
                Your current plan stays active until the end of the billing period. Your data is never deleted — items beyond a
                lower plan&apos;s limits are simply hidden until you upgrade again.</>
        ),
    },
    {
        q: 'My map widget is not loading on my website. What do I do?',
        keywords: 'map not loading widget broken fix troubleshoot script blocked',
        a: (
            <>First, confirm the <code>widgets.js</code> script and the <code>&lt;locator-widget&gt;</code> tag are both on the
                page and the <code>locator</code> attribute holds the correct ID. Some WordPress security plugins block external
                scripts — whitelist <code>storefindy.com</code>. Still stuck?{' '}
                <a onClick={(e) => { e.preventDefault(); document.getElementById('sf-contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} href="#sf-contact-form">Contact our support team</a>{' '}
                with your website URL and we&apos;ll help diagnose it.</>
        ),
    },
    {
        q: 'How do I find the latitude and longitude of my store?',
        keywords: 'coordinates latitude longitude find location geocode map pin',
        a: (
            <>When adding a location, type the address into the map search and Storefindy auto-fills the coordinates — or click
                anywhere on the map to drop a pin. For bulk CSV imports, a free geocoding tool like <code>geocode.maps.co</code>{' '}
                converts addresses to coordinates in one go.</>
        ),
    },
    {
        q: 'When does analytics data start showing up?',
        keywords: 'analytics data tracking views searches delay embedded',
        a: (
            <>Analytics records within a few minutes of your widget going live on a real website. Only{' '}
                <strong>embedded widgets and subdomains</strong> are tracked — activity inside the Customize preview is not
                counted. Load your live page a few times and check back after 10–15 minutes. Note that analytics is a Pro and
                Business feature.</>
        ),
    },
];

const TOPIC_OPTIONS = [
    'Widget not loading',
    'CSV import issue',
    'Billing & payments',
    'Account access',
    'Feature request',
    'Analytics question',
    'Subdomain help',
    'Other',
];

const STATUS_ITEMS = [
    { name: 'Widget & embed delivery', state: 'ok', label: 'Operational' },
    { name: 'Dashboard & API', state: 'ok', label: 'Operational' },
    { name: 'Map tiles (OpenStreetMap)', state: 'ok', label: 'Operational' },
    { name: 'Analytics processing', state: 'warn', label: 'Degraded' },
    { name: 'Subdomain routing', state: 'ok', label: 'Operational' },
    { name: 'Billing (Lemon Squeezy)', state: 'ok', label: 'Operational' },
];

const POPULAR_ARTICLES = [
    { title: 'How to embed the widget on any website', meta: '2,841 views · 5 min read', href: '/dashboard/documentation#embed' },
    { title: 'Bulk import locations via CSV', meta: '1,924 views · 4 min read', href: '/dashboard/documentation#import-csv' },
    { title: 'Setting up a custom subdomain', meta: '1,102 views · 3 min read', href: '/dashboard/documentation#subdomains' },
    { title: 'Finding latitude & longitude for your stores', meta: '987 views · 3 min read', href: '/dashboard/documentation#locations' },
    { title: 'Customizing widget colors and appearance', meta: '876 views · 6 min read', href: '/dashboard/documentation#customize' },
];

export default function HelpAndSupportPage() {
    const formRef = useRef(null);
    const [state, action, pending] = useActionState(submitSupportTicket, { status: 'idle' });

    const [query, setQuery] = useState('');
    const [openFaq, setOpenFaq] = useState(null);
    const [topic, setTopic] = useState('');
    const [message, setMessage] = useState('');
    const [ctx, setCtx] = useState({ email: '', planName: '', priority: false, previousTickets: [] });

    useEffect(() => {
        getSupportContext()
            .then((data) => setCtx(data))
            .catch(() => { /* non-blocking */ });
    }, []);

    useEffect(() => {
        if (state.status === 'success') {
            toast.success('Message sent', { description: state.message });
            formRef.current?.reset();
            // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing controlled inputs after a completed submit
            setTopic('');
            setMessage('');
        } else if (state.status === 'error') {
            toast.warning('Please check the form', { description: Object.values(state.errors)[0] });
        } else if (state.status === 'fatal') {
            toast.error('Something went wrong', { description: state.message });
        }
    }, [state]);

    const errors = state.status === 'error' ? state.errors : {};

    const filteredFaqs = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return FAQS;
        return FAQS.filter((f) => (`${f.q} ${f.keywords}`).toLowerCase().includes(q));
    }, [query]);

    const scrollToForm = () => {
        document.getElementById('sf-contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Help and Support</h1>
                    <p>Dashboard <RiArrowRightLine /> Support <RiArrowRightLine /> Help and Support</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.helpAndSupport}>

                        {/* HERO SEARCH */}
                        <div className={styles.helpHero}>
                            <div className={styles.helpHeroIcon}><TbLifebuoy /></div>
                            <h2>How can we help you?</h2>
                            <p>Search our knowledge base or choose a support option below.</p>
                            <div className={styles.searchRow}>
                                <div className={styles.searchBox}>
                                    <TbSearch />
                                    <input
                                        type="text"
                                        placeholder="Search for answers… e.g. how to embed the widget"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            {query.trim() && (
                                <div className={styles.searchHint}>
                                    {filteredFaqs.length} result{filteredFaqs.length === 1 ? '' : 's'} in the FAQ below
                                </div>
                            )}
                        </div>

                        {/* CONTACT CARDS */}
                        <div className={styles.contactGrid}>
                            <div className={styles.contactCard} onClick={scrollToForm} role="button">
                                <div className={`${styles.ccIcon} ${styles.yellow}`}><TbMail /></div>
                                <div className={styles.ccTitle}>Email Support</div>
                                <div className={styles.ccDesc}>Send us a message and we&apos;ll reply within 24–48 hours on business days.</div>
                                <span className={`${styles.ccBadge} ${styles.slow}`}>Replies in 24–48 hrs</span>
                            </div>
                            <Link href="/dashboard/documentation" className={styles.contactCard}>
                                <div className={`${styles.ccIcon} ${styles.blue}`}><TbBook /></div>
                                <div className={styles.ccTitle}>Documentation</div>
                                <div className={styles.ccDesc}>Browse step-by-step guides, feature walkthroughs, and the FAQ.</div>
                                <span className={`${styles.ccBadge} ${styles.fast}`}>Instant access</span>
                            </Link>
                            <div className={styles.contactCard} onClick={ctx.priority ? scrollToForm : undefined} role="button">
                                <div className={`${styles.ccIcon} ${styles.green}`}><TbHeadset /></div>
                                <div className={styles.ccTitle}>Priority Support</div>
                                <div className={styles.ccDesc}>Business plan users get priority responses within 4–8 hours.</div>
                                <span className={`${styles.ccBadge} ${ctx.priority ? styles.fast : styles.pro}`}>
                                    {ctx.priority ? 'Active on your plan' : 'Business plan only'}
                                </span>
                            </div>
                        </div>

                        {/* TWO COLUMN */}
                        <div className={styles.twoCol}>

                            {/* LEFT */}
                            <div className={styles.col}>

                                {/* BROWSE BY TOPIC */}
                                <div className={styles.hsCard}>
                                    <div className={styles.hsCardHeader}>
                                        <div className={styles.hsCardTitle}><TbCategory /> Browse by Topic</div>
                                    </div>
                                    <div className={styles.topicGrid}>
                                        {TOPICS.map((t) => (
                                            <Link key={t.text} href={t.href} className={styles.topicItem}>
                                                <div className={`${styles.topicIcon} ${styles[t.tone]}`}>{t.icon}</div>
                                                <div className={styles.topicInfo}>
                                                    <div className={styles.topicText}>{t.text}</div>
                                                    <div className={styles.topicSub}>{t.sub}</div>
                                                </div>
                                                <TbChevronRight className={styles.topicArrow} />
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* FAQ */}
                                <div className={styles.hsCard}>
                                    <div className={styles.hsCardHeader}>
                                        <div className={styles.hsCardTitle}><TbMessageQuestion /> Frequently Asked Questions</div>
                                    </div>
                                    {filteredFaqs.length === 0 ? (
                                        <p className={styles.faqEmpty}>
                                            No answers matched “{query}”. Try different keywords or{' '}
                                            <a href="#sf-contact-form" onClick={(e) => { e.preventDefault(); scrollToForm(); }}>send us a message</a>.
                                        </p>
                                    ) : (
                                        <div className={styles.faqList}>
                                            {filteredFaqs.map((f) => {
                                                const isOpen = openFaq === f.q;
                                                return (
                                                    <div key={f.q} className={styles.faqItem}>
                                                        <div
                                                            className={styles.faqQ}
                                                            role="button"
                                                            onClick={() => setOpenFaq(isOpen ? null : f.q)}
                                                        >
                                                            <span className={styles.faqQText}>{f.q}</span>
                                                            <TbPlus className={`${styles.faqIcon} ${isOpen ? styles.open : ''}`} />
                                                        </div>
                                                        {isOpen && <div className={styles.faqA}>{f.a}</div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT */}
                            <div className={styles.col}>

                                {/* CONTACT FORM */}
                                <div className={styles.hsCard} id="sf-contact-form">
                                    <div className={styles.hsCardHeader}>
                                        <div className={styles.hsCardTitle}><TbSend /> Send us a message</div>
                                    </div>
                                    <form ref={formRef} action={action}>
                                        <input type="hidden" name="plan" value={ctx.planName || ''} />
                                        <input type="hidden" name="page_url" value={pageUrl} />

                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Subject</label>
                                            <select
                                                className={styles.formSelect}
                                                name="topic"
                                                value={topic}
                                                onChange={(e) => setTopic(e.target.value)}
                                            >
                                                <option value="">— Select a topic —</option>
                                                {TOPIC_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Your email</label>
                                            <input
                                                className={styles.formInput}
                                                type="email"
                                                value={ctx.email || ''}
                                                readOnly
                                            />
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Message <span className={styles.req}>*</span></label>
                                            <textarea
                                                className={`${styles.formTextarea} ${errors.message ? styles.errorInput : ''}`}
                                                name="message"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                                                placeholder="Describe your issue or question in detail. Include your website URL if relevant…"
                                                required
                                            />
                                            <div className={styles.formFoot}>
                                                {errors.message
                                                    ? <span className={styles.formError}>{errors.message}</span>
                                                    : <span />}
                                                <span className={styles.formCount}>{message.length} / 2000</span>
                                            </div>
                                        </div>

                                        <div className={styles.formNote}>
                                            <TbInfoCircle />
                                            Your account info is automatically attached to help us resolve your issue faster.
                                        </div>

                                        <button className={styles.btnSubmit} type="submit" disabled={pending}>
                                            <TbSend /> {pending ? 'Sending…' : 'Send Message'}
                                        </button>
                                    </form>
                                </div>

                                {/* PREVIOUS TICKETS */}
                                {ctx.previousTickets && ctx.previousTickets.length > 0 && (
                                    <div className={styles.hsCard}>
                                        <div className={styles.hsCardHeader}>
                                            <div className={styles.hsCardTitle}><TbHistory /> Your Recent Messages</div>
                                        </div>
                                        <div className={styles.ticketList}>
                                            {ctx.previousTickets.map((t) => (
                                                <div key={t.id} className={styles.ticketItem}>
                                                    <div className={styles.ticketRef}>{t.reference}</div>
                                                    <div className={styles.ticketTopic}>{t.topic || 'General enquiry'}</div>
                                                    <span className={`${styles.ticketStatus} ${styles[t.status] || styles.open}`}>
                                                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* SYSTEM STATUS */}
                                <div className={styles.hsCard}>
                                    <div className={styles.hsCardHeader}>
                                        <div className={styles.hsCardTitle}><TbActivityHeartbeat /> System Status</div>
                                        <a
                                            className={styles.hsCardAction}
                                            href="https://status.storefindy.com"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Status page <TbExternalLink />
                                        </a>
                                    </div>
                                    <div className={styles.statusList}>
                                        {STATUS_ITEMS.map((s) => (
                                            <div key={s.name} className={styles.statusRow}>
                                                <span className={`${styles.statusDot} ${styles[s.state]}`} />
                                                <span className={styles.statusName}>{s.name}</span>
                                                <span className={`${styles.statusBadge} ${styles[s.state]}`}>{s.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.statusFoot}>
                                        Last checked: just now · <span>⚠ Analytics delays — team is investigating</span>
                                    </div>
                                </div>

                                {/* POPULAR ARTICLES */}
                                <div className={styles.hsCard}>
                                    <div className={styles.hsCardHeader}>
                                        <div className={styles.hsCardTitle}><TbTrendingUp /> Popular Articles</div>
                                        <Link className={styles.hsCardAction} href="/dashboard/documentation">
                                            All docs <TbArrowRight />
                                        </Link>
                                    </div>
                                    <div className={styles.articleList}>
                                        {POPULAR_ARTICLES.map((a, i) => (
                                            <Link key={a.title} href={a.href} className={styles.articleItem}>
                                                <div className={styles.articleNum}>{i + 1}</div>
                                                <div className={styles.articleInfo}>
                                                    <div className={styles.articleTitle}>{a.title}</div>
                                                    <div className={styles.articleMeta}><TbEye /> {a.meta}</div>
                                                </div>
                                                <TbChevronRight className={styles.articleArrow} />
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SUPPORT FOOTER */}
                        <div className={styles.helpFooter}>
                            <div className={styles.helpFooterIcon}><TbCircleCheck /></div>
                            <div className={styles.helpFooterInfo}>
                                <div className={styles.helpFooterTitle}>Can&apos;t find what you&apos;re looking for?</div>
                                <div className={styles.helpFooterDesc}>Send us a message and our team will get back to you.</div>
                            </div>
                            <button className={styles.helpFooterBtn} type="button" onClick={scrollToForm}>
                                <TbMail /> Contact support
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
