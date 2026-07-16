import Link from 'next/link';
import styles from './Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import QuickEmbed from './QuickEmbed';
import { getLocators, getHomeData } from '@/actions/locator';
import { getBillingStatus } from '@/actions/billing';
import { plans } from '@/utils/constant/pricing';
import {
    TbMapPin,
    TbEye,
    TbSearch,
    TbNavigation,
    TbTrendingUp,
    TbMap,
    TbCalendar,
    TbBolt,
    TbMapPlus,
    TbMapPinPlus,
    TbUpload,
    TbPalette,
    TbCode,
    TbChartBar,
    TbWorld,
    TbChartLine,
    TbActivity,
    TbCrown,
    TbRocket,
    TbMapPinOff,
    TbCreditCard,
    TbArrowRight,
} from 'react-icons/tb';
import { mongooseFormatTimeAgo } from '@/utils/helpers';

// Build the SVG polyline for the "Views Over Time" chart. (Same technique as the
// Analytics "Views Over Time" chart.)
function buildLineChart(VIEWS_DATA = []) {
    const W = 320;
    const H = 110;
    const P = 10;
    const n = VIEWS_DATA.length;
    const max = n ? Math.max(...VIEWS_DATA) : 0;
    const min = n ? Math.min(...VIEWS_DATA) : 0;
    // Guard against divide-by-zero: a single data point has no horizontal span,
    // and a flat series (all equal) has no vertical span — either would yield NaN.
    const span = max - min;
    const pts = VIEWS_DATA.map((v, i) => {
        const x = n > 1 ? P + (i / (n - 1)) * (W - 2 * P) : W / 2;
        const y = span > 0 ? H - P - ((v - min) / span) * (H - 2 * P) : H / 2;
        return { x, y };
    });
    const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = pts.length ? `${P},${H - P} ${line} ${W - P},${H - P}` : '';
    return { W, H, pts, line, area };
}

// "Edited 2d ago" style label from a serialized date string.
function editedLabel(dateStr) {
    if (!dateStr) return 'Just created';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just created';
    if (mins < 60) return `Edited ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Edited ${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `Edited ${days}d ago`;
}

const THUMB_GRADIENTS = [
    'linear-gradient(135deg,#dce8f5,#c8dff0)',
    'linear-gradient(135deg,#e8f0de,#d5e8c0)',
    'linear-gradient(135deg,#f5e8f5,#ecd5f0)',
    'linear-gradient(135deg,#fdeede,#f7dcc0)',
];

export default async function DashboardPage() {
    const locators = await getLocators();

    // ── Plan usage (locators/locations are real; the rest is dummy for now) ──
    const proPlan = plans.find((p) => p.id === 'pro') || plans[0];
    const locatorsCount = locators.length;
    const totalLocations = locators.reduce((acc, l) => acc + (l.total_locations || 0), 0);

    // ── Quick actions ──
    const QUICK_ACTIONS = [
        { icon: <TbMapPlus />, bg: '#fffbe6', color: '#BA7517', text: 'New Locator', sub: 'Create a widget', href: '/dashboard/locators/create' },
        { icon: <TbMapPinPlus />, bg: '#EBF4FF', color: '#185FA5', text: 'Add Location', sub: 'Pin a store', href: '/dashboard/locations/add-location' },
        { icon: <TbUpload />, bg: '#EAF3DE', color: '#3B6D11', text: 'Import CSV', sub: 'Bulk upload', href: '/dashboard/locations/import-csv' },
        { icon: <TbPalette />, bg: '#f5f0ff', color: '#7c3aed', text: 'Customize', sub: 'Edit appearance', href: '/dashboard/locators/customize' },
        { icon: <TbCode />, bg: '#fff0f0', color: '#E05C2A', text: 'Embed Widget', sub: 'Get the code', href: '/dashboard/locators/embed' },
        { icon: <TbChartBar />, bg: '#f0f9ff', color: '#0284c7', text: 'Analytics', sub: 'View insights', href: '/dashboard/analytics' },
    ];

    // ── Recent activity (dummy) ──
    const ACTIVITY = [
        { bg: '#EAF3DE', color: '#3B6D11', icon: <TbMapPinPlus />, text: <><strong>SM Mall of Asia</strong> added to Main Store Locator</>, time: '2 minutes ago' },
        { bg: '#EBF4FF', color: '#185FA5', icon: <TbUpload />, text: <>CSV import completed — <strong>12 locations</strong> added to Branch Finder</>, time: '1 hour ago' },
        { bg: '#f5f0ff', color: '#7c3aed', icon: <TbPalette />, text: <>Customizer updated for <strong>Main Store Locator</strong> — pin color changed</>, time: '3 hours ago' },
        { bg: '#fffbe6', color: '#BA7517', icon: <TbWorld />, text: <>Subdomain <strong>mybrand.storefindy.com</strong> activated</>, time: 'Yesterday at 4:22 PM' },
        { bg: '#EAF3DE', color: '#3B6D11', icon: <TbMapPlus />, text: <>New locator <strong>Pop-up Stores</strong> created</>, time: 'Yesterday at 2:10 PM' },
        { bg: '#FCEBEB', color: '#A32D2D', icon: <TbMapPinOff />, text: <><strong>Rose Pharmacy Cebu</strong> removed from Branch Finder</>, time: '2 days ago' },
        { bg: '#EBF4FF', color: '#185FA5', icon: <TbCreditCard />, text: <>Pro plan renewed — <strong>$10.00</strong> charged via Lemon Squeezy</>, time: 'Jun 1, 2026' },
    ];

    const firstLocator = locators[0];


    const homeData = await getHomeData();
    const billingData = await getBillingStatus();
    console.log(billingData, 'billingData');

    // ── Stat cards (built from homeData.statistics) ──
    // Icon + colors are presentation-only, keyed by stat name; label/value/trend
    // come from the API.
    const STAT_STYLES = {
        widget_views: { icon: <TbEye />, iconBg: '#fffbe6', iconColor: '#BA7517' },
        total_sub_domains_visits: { icon: <TbWorld />, iconBg: '#EBF4FF', iconColor: '#185FA5' },
        total_active_locators: { icon: <TbMap />, iconBg: '#EAF3DE', iconColor: '#3B6D11' },
        total_active_locations: { icon: <TbMapPin />, iconBg: '#f5f0ff', iconColor: '#7c3aed' },
    };

    // The API is inconsistent about which field holds what: some stats put the
    // % in `trend` with a boolean `up`, others put the display text in `up` with
    // the trend type in `trend`. Normalize both shapes to { trend, trendType }.
    const normalizeTrend = (stat) => {
        if (typeof stat.up === 'boolean') {
            return { trend: stat.trend, trendType: stat.up ? 'up' : 'down' };
        }
        return { trend: stat.up, trendType: stat.trend };
    };

    const STATS = Object.keys(STAT_STYLES)
        .filter((key) => homeData.statistics?.[key])
        .map((key) => {
            const stat = homeData.statistics[key];
            return {
                ...STAT_STYLES[key],
                label: stat.label,
                value: stat.value,
                ...normalizeTrend(stat),
            };
        });

    // ── Upgrade nudge: point at the next plan up, or hide it on the top plan ──
    const currentPlanIndex = plans.findIndex((p) => p.id === billingData.id);
    const nextPlan = plans[currentPlanIndex + 1];

    // ── Views over time chart ──
    const VIEWS_DATA = homeData.views_over_time.views_data;
    const VIEWS_LABELS = homeData.views_over_time.views_labels;
    const { W, H, pts, line, area } = buildLineChart(VIEWS_DATA);
    // Thin the x-axis labels so a 30-point series doesn't crowd/wrap.
    const AXIS_LABEL_STEP = Math.max(1, Math.ceil(VIEWS_LABELS.length / 7));
    const AXIS_LABELS = VIEWS_LABELS.filter((_, i) => i % AXIS_LABEL_STEP === 0);

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Dashboard</h1>
                    <p>Here&apos;s what&apos;s happening with your store locators today.</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.home}>

                        {/* WELCOME BANNER */}
                        <div className={styles.welcome}>
                            <div className={styles.wIcon}><TbMapPin /></div>
                            <div className={styles.wInfo}>
                                <div className={styles.wTitle}>Welcome back!</div>
                                <div className={styles.wDesc}>
                                    Your store locators are live and helping customers find you. You have {locatorsCount} locator{locatorsCount === 1 ? '' : 's'} across {totalLocations} location{totalLocations === 1 ? '' : 's'}.
                                </div>
                            </div>
                            <div className={styles.wRight}>
                                <div className={styles.wPlan}>{billingData.planName} Plan</div>
                                <div className={styles.wDate}>
                                    {billingData.renewal && billingData.renewal !== '-'
                                        ? `Renews ${new Date(billingData.renewal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                        : 'No renewal'}
                                </div>
                            </div>
                        </div>

                        {/* STAT CARDS */}
                        <div className={styles.statsGrid}>
                            {STATS.map((s) => (
                                <div className={styles.sc} key={s.label}>
                                    <div className={styles.scTop}>
                                        <div className={styles.scIcon} style={{ background: s.iconBg, color: s.iconColor }}>{s.icon}</div>
                                        <div className={`${styles.scTrend} ${styles[s.trendType]}`}>
                                            {s.trendType === 'up' && <TbTrendingUp />} {s.trend}
                                        </div>
                                    </div>
                                    <div className={styles.scVal}>{s.value}</div>
                                    <div className={styles.scLbl}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* LOCATORS + QUICK ACTIONS / PLAN USAGE */}
                        <div className={styles.twoCol}>

                            {/* MY LOCATORS */}
                            <div className={styles.card} style={{ display: 'flex', flexDirection: 'column' }}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitle}><TbMap /> My Locators</div>
                                    <Link className={styles.cardAction} href="/dashboard/locators">View all <TbArrowRight /></Link>
                                </div>
                                <div className={styles.locatorList}>
                                    {locatorsCount === 0 && (
                                        <div className={styles.locEmpty}>
                                            No locators yet. <Link href="/dashboard/locators/create">Create your first locator</Link>.
                                        </div>
                                    )}
                                    {locators.slice(0, 3).map((l, i) => (
                                        <Link className={styles.locItem} href={`/dashboard/locators/customize/${l._id}`} key={l._id}>
                                            <div className={styles.locMapThumb} style={{ background: l.status === 'active' ? THUMB_GRADIENTS[i % THUMB_GRADIENTS.length] : '#f5f5f3' }}>
                                                <span style={{ fontSize: 18, opacity: l.status === 'active' ? 1 : 0.4 }}>📍</span>
                                            </div>
                                            <div className={styles.locInfo}>
                                                <div className={styles.locName}>{l.name}</div>
                                                <div className={styles.locMeta}>
                                                    <TbMapPin /> {l.total_locations || 0} locations
                                                    <span className={styles.locDot}>·</span>
                                                    <TbCalendar /> { mongooseFormatTimeAgo(l.createdAt, l.updatedAt) }
                                                </div>
                                            </div>
                                            <div className={styles.locRight}>
                                                <div className={styles.locViews}>{l.views_count || 0}</div>
                                                <div className={styles.locViewsLbl}>views</div>
                                                <div className={`${styles.locStatus} ${l.status === 'active' ? styles.active : styles.inactive}`}>
                                                    {l.status === 'active' ? 'Active' : 'Inactive'}
                                                </div>
                                            </div>
                                        </Link> 
                                    ))}
                                </div>

                                {firstLocator && (
                                    <QuickEmbed locatorName={firstLocator.name} locatorId={firstLocator._id} />
                                )}
                            </div>

                            {/* RIGHT COL */}
                            <div className={styles.rightCol}>

                                {/* QUICK ACTIONS */}
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardTitle}><TbBolt /> Quick Actions</div>
                                    </div>
                                    <div className={styles.qaGrid}>
                                        {QUICK_ACTIONS.map((a) => (
                                            <Link className={styles.qaBtn} href={a.href} key={a.text}>
                                                <div className={styles.qaIcon} style={{ background: a.bg, color: a.color }}>{a.icon}</div>
                                                <div>
                                                    <div className={styles.qaText}>{a.text}</div>
                                                    <div className={styles.qaSub}>{a.sub}</div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* CURRENT USAGE */}
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardTitle}><TbChartBar /> Current Usage</div>
                                        <Link className={styles.cardAction} href="/dashboard/billing">Billing <TbArrowRight /></Link>
                                    </div>
                                    <div className={styles.planBadgeRow}>
                                        <div className={styles.planBadge}>{billingData.planName} Plan</div>
                                        <div className={styles.planRenew}>
                                            {billingData.renewal && billingData.renewal !== '-'
                                                ? `Renews ${new Date(billingData.renewal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                                : 'No renewal'}
                                        </div>
                                    </div>
                                    {billingData.usage.map((item) => (
                                        <div className={styles.usageItem} key={item.label}>
                                            <div className={styles.usageRow}>
                                                <div className={styles.usageLabel}>{item.icon} {item.label}</div>
                                                <div className={styles.usageCount}>{item.used} <span>/ {item.limit}</span></div>
                                            </div>
                                            <div className={styles.usageBar}>
                                                <div
                                                    className={styles.usageFill}
                                                    style={{
                                                        width: `${Math.min(100, item.percent)}%`,
                                                        background: item.fill === 'warn' ? '#E05C2A' : item.fill === 'ok' ? '#639922' : '#ffe54c',
                                                    }}
                                                />
                                            </div>
                                            <div className={styles.usageHint}>{item.hint}</div>
                                        </div>
                                    ))}
                                </div>

                            </div>
                        </div>

                        {/* VIEWS CHART + ACTIVITY */}
                        <div className={styles.threeCol}>

                            {/* VIEWS OVER TIME CHART */}
                            <div className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitle}><TbChartLine /> Views Over Time - Last 30 Days</div>
                                    <Link className={styles.cardAction} href="/dashboard/analytics">Full report <TbArrowRight /></Link>
                                </div>
                                <svg className={styles.lineChart} style={{ height: 'auto' }} viewBox={`0 0 ${W} ${H}`}>
                                    <polygon points={area} fill="rgba(255,229,76,0.18)" />
                                    <polyline points={line} fill="none" stroke="#ffe54c" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                                    {pts.map((p, i) => (
                                        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#ffe54c" stroke="#fff" strokeWidth="1" />
                                    ))}
                                </svg>
                                <div className={styles.lineLabels}>
                                    {AXIS_LABELS.map((l, index) => <span key={l + index}>{l}</span>)}
                                </div>
                            </div>

                            {/* RECENT ACTIVITY */}
                            <div className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitle}><TbActivity /> Recent Activity</div>
                                </div>
                                <div className={styles.activityList}>
                                    {ACTIVITY.map((a, i) => (
                                        <div className={styles.actItem} key={i}>
                                            <div className={styles.actIcon} style={{ background: a.bg, color: a.color }}>{a.icon}</div>
                                            <div className={styles.actBody}>
                                                <div className={styles.actText}>{a.text}</div>
                                                <div className={styles.actTime}>{a.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* UPGRADE NUDGE */}
                        {nextPlan && (
                            <div className={styles.upgradeNudge}>
                                <div className={styles.unIcon}><TbCrown /></div>
                                <div className={styles.unInfo}>
                                    <div className={styles.unTitle}>Unlock more with {nextPlan.name}</div>
                                    <div className={styles.unDesc}>
                                        Upgrade to {nextPlan.name} for {nextPlan.max_locator} locators,{' '}
                                        {nextPlan.max_location === 0 ? 'unlimited locations' : `up to ${nextPlan.max_location} locations`}, and{' '}
                                        {nextPlan.max_sub_domain} custom subdomains.
                                    </div>
                                </div>
                                <Link className={styles.btnUpgradeSm} href="/dashboard/billing"><TbRocket /> Upgrade to {nextPlan.name}</Link>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
