import Link from 'next/link';
import styles from './Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import QuickEmbed from './QuickEmbed';
import { getLocators } from '@/actions/locator';
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
    TbChartPie,
    TbWorld,
    TbChartLine,
    TbActivity,
    TbCrown,
    TbRocket,
    TbMapPinOff,
    TbCreditCard,
    TbArrowRight,
} from 'react-icons/tb';

// Build SVG polylines for the "Widget Views" chart. All series share the same
// scale so they line up. (Same technique as the Analytics "Views Over Time" chart.)
function buildLineChart(series, W = 320, H = 110, P = 10) {
    const all = series.flatMap((s) => s.data);
    const max = all.length ? Math.max(...all) : 0;
    const min = all.length ? Math.min(...all) : 0;
    const span = max - min || 1;
    const n = series[0]?.data.length ?? 0;
    return series.map((s) => {
        const pts = s.data.map((v, i) => {
            const x = n > 1 ? P + (i / (n - 1)) * (W - 2 * P) : W / 2;
            const y = H - P - ((v - min) / span) * (H - 2 * P);
            return { x, y };
        });
        const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const area = pts.length ? `${P},${H - P} ${line} ${W - P},${H - P}` : '';
        return { ...s, pts, line, area };
    });
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
    const locatorPct = Math.min(100, Math.round((locatorsCount / proPlan.max_locator) * 100) || 0);
    const locationPct = Math.min(100, Math.round((totalLocations / proPlan.max_location) * 100) || 0);

    // ── Stat cards (dummy, except Total Locations) ──
    const STATS = [
        { icon: <TbEye />, iconBg: '#fffbe6', iconColor: '#BA7517', trend: '+14%', trendType: 'up', value: '8,421', label: 'Widget Views this month' },
        { icon: <TbSearch />, iconBg: '#EBF4FF', iconColor: '#185FA5', trend: '+8%', trendType: 'up', value: '3,102', label: 'Searches this month' },
        { icon: <TbNavigation />, iconBg: '#EAF3DE', iconColor: '#3B6D11', trend: '+6%', trendType: 'up', value: '1,284', label: 'Direction Clicks' },
        { icon: <TbMapPin />, iconBg: '#f5f5f3', iconColor: '#555', trend: `${totalLocations} / ${proPlan.max_location}`, trendType: 'neu', value: totalLocations.toLocaleString(), label: 'Total Locations' },
    ];

    // ── Quick actions ──
    const QUICK_ACTIONS = [
        { icon: <TbMapPlus />, bg: '#fffbe6', color: '#BA7517', text: 'New Locator', sub: 'Create a widget', href: '/dashboard/locators/create' },
        { icon: <TbMapPinPlus />, bg: '#EBF4FF', color: '#185FA5', text: 'Add Location', sub: 'Pin a store', href: '/dashboard/locations/add-location' },
        { icon: <TbUpload />, bg: '#EAF3DE', color: '#3B6D11', text: 'Import CSV', sub: 'Bulk upload', href: '/dashboard/locations/import-csv' },
        { icon: <TbPalette />, bg: '#f5f0ff', color: '#7c3aed', text: 'Customize', sub: 'Edit appearance', href: '/dashboard/locators/customize' },
        { icon: <TbCode />, bg: '#fff0f0', color: '#E05C2A', text: 'Embed Widget', sub: 'Get the code', href: '/dashboard/locators/embed' },
        { icon: <TbChartBar />, bg: '#f0f9ff', color: '#0284c7', text: 'Analytics', sub: 'View insights', href: '/dashboard/analytics' },
    ];

    // ── Plan usage rows ──
    const USAGE = [
        {
            icon: <TbMap />, label: 'Locators',
            count: `${locatorsCount} / ${proPlan.max_locator}`,
            pct: locatorPct,
            fill: locatorPct >= 100 ? '#E05C2A' : '#ffe54c',
            hint: locatorPct >= 100 ? 'Limit reached — upgrade for more' : `${Math.max(0, proPlan.max_locator - locatorsCount)} locator slot(s) remaining`,
            hintColor: locatorPct >= 100 ? '#E05C2A' : '#aaa',
        },
        {
            icon: <TbMapPin />, label: 'Locations',
            count: `${totalLocations} / ${proPlan.max_location}`,
            pct: locationPct,
            fill: '#ffe54c',
            hint: `${Math.max(0, proPlan.max_location - totalLocations)} remaining`,
            hintColor: '#aaa',
        },
        {
            icon: <TbWorld />, label: 'Subdomains',
            count: `2 / ${proPlan.max_sub_domain}`,
            pct: Math.round((2 / proPlan.max_sub_domain) * 100),
            fill: '#ffe54c',
            hint: `${Math.max(0, proPlan.max_sub_domain - 2)} subdomain slot remaining`,
            hintColor: '#aaa',
        },
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

    // ── Widget views chart (dummy) ──
    const CHART = buildLineChart([
        { key: 'main', color: '#ffe54c', fill: 'rgba(255,229,76,0.18)', data: [180, 210, 260, 280, 320, 340, 380, 400, 380, 460, 420, 520, 560] },
        { key: 'branch', color: '#185FA5', fill: 'rgba(24,95,165,0.06)', data: [80, 100, 120, 130, 150, 160, 175, 185, 185, 220, 215, 250, 270] },
    ]);
    const CHART_LABELS = ['Jun 1', 'Jun 8', 'Jun 15', 'Jun 22', 'Jun 30'];

    const firstLocator = locators[0];

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
                                <div className={styles.wPlan}>Pro Plan</div>
                                <div className={styles.wDate}>Renews Jul 1, 2026</div>
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
                            <div className={styles.card}>
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
                                                    <TbCalendar /> {editedLabel(l.updatedAt)}
                                                </div>
                                            </div>
                                            <div className={styles.locRight}>
                                                <div className={styles.locViews}>{l.total_locations ? (l.total_locations * 93).toLocaleString() : '0'}</div>
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

                                {/* PLAN USAGE */}
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardTitle}><TbChartPie /> Plan Usage</div>
                                        <Link className={styles.cardAction} href="/dashboard/billing">Billing <TbArrowRight /></Link>
                                    </div>
                                    <div className={styles.planBadgeRow}>
                                        <div className={styles.planBadge}>Pro Plan</div>
                                        <div className={styles.planRenew}>Renews Jul 1, 2026</div>
                                    </div>
                                    {USAGE.map((u) => (
                                        <div className={styles.usageItem} key={u.label}>
                                            <div className={styles.usageRow}>
                                                <div className={styles.usageLabel}>{u.icon} {u.label}</div>
                                                <div className={styles.usageCount}>{u.count}</div>
                                            </div>
                                            <div className={styles.usageBar}>
                                                <div className={styles.usageFill} style={{ width: `${u.pct}%`, background: u.fill }} />
                                            </div>
                                            <div className={styles.usageHint} style={{ color: u.hintColor }}>{u.hint}</div>
                                        </div>
                                    ))}
                                </div>

                            </div>
                        </div>

                        {/* VIEWS CHART + ACTIVITY */}
                        <div className={styles.threeCol}>

                            {/* WIDGET VIEWS CHART */}
                            <div className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitle}><TbChartLine /> Widget Views — Last 30 Days</div>
                                    <Link className={styles.cardAction} href="/dashboard/analytics">Full report <TbArrowRight /></Link>
                                </div>
                                <div className={styles.chartLegend}>
                                    {CHART.map((s) => (
                                        <span className={styles.legendItem} key={s.key}>
                                            <span className={styles.legendDot} style={{ background: s.color }} />
                                            {s.key === 'main' ? 'Main Locator' : 'Branch Finder'}
                                        </span>
                                    ))}
                                </div>
                                <svg className={styles.lineChart} viewBox="0 0 320 110" preserveAspectRatio="none">
                                    {CHART.map((s) => <polygon key={`a-${s.key}`} points={s.area} fill={s.fill} />)}
                                    {CHART.map((s) => (
                                        <polyline key={`l-${s.key}`} points={s.line} fill="none" stroke={s.color} strokeWidth={s.key === 'main' ? 2.5 : 1.8} strokeLinejoin="round" strokeLinecap="round" />
                                    ))}
                                </svg>
                                <div className={styles.lineLabels}>
                                    {CHART_LABELS.map((l) => <span key={l}>{l}</span>)}
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
                        <div className={styles.upgradeNudge}>
                            <div className={styles.unIcon}><TbCrown /></div>
                            <div className={styles.unInfo}>
                                <div className={styles.unTitle}>Unlock more with Business</div>
                                <div className={styles.unDesc}>Upgrade to Business for 10 locators, unlimited locations, advanced analytics, heatmap, and priority support.</div>
                            </div>
                            <Link className={styles.btnUpgradeSm} href="/dashboard/billing"><TbRocket /> Upgrade to Business</Link>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
