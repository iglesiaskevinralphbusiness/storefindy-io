'use server';
import { Fragment } from 'react';
import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import { getAnalyticsData } from '@/actions/locator';
import {    
    TbEye,
    TbSearch,
    TbNavigation,
    TbClick,
    TbTrendingUp,
    TbTrendingDown,
    TbChartLine,
    TbDevices,
    TbDeviceMobile,
    TbDeviceLaptop,
    TbDeviceTablet,
    TbFlame,
    TbBuildingCommunity,
    TbTags,
    TbMap2,
    TbClock,
    TbMapPin,
    TbCalendar,
    TbDownload,
    TbCrown,
} from 'react-icons/tb';
import Button from '@/components/Forms/Button';

const STATS = [
    { label: 'Widget Views', value: '24,831', trend: '+18% vs last period', up: true, icon: <TbEye /> },
    { label: 'Total Searches', value: '8,204', trend: '+12% vs last period', up: true, icon: <TbSearch /> },
    { label: 'Direction Clicks', value: '3,417', trend: '+9% vs last period', up: true, icon: <TbNavigation /> },
    { label: 'Avg Click-through', value: '41.6%', trend: '-2% vs last period', up: false, icon: <TbClick /> },
];

const HEAT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEAT_HOURS = ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'];
const HEAT_DATA = [
    [2, 1, 0, 1, 3, 8, 22, 38, 45, 42, 28, 12],
    [3, 1, 0, 1, 4, 9, 24, 42, 48, 44, 30, 14],
    [2, 1, 0, 1, 3, 8, 21, 40, 46, 43, 29, 13],
    [3, 1, 0, 1, 4, 10, 25, 44, 50, 46, 32, 15],
    [4, 2, 1, 1, 5, 12, 28, 48, 54, 52, 38, 20],
    [8, 4, 2, 2, 6, 14, 32, 52, 60, 62, 54, 32],
    [6, 3, 1, 1, 5, 10, 26, 44, 52, 54, 42, 24],
];
const heatColor = (v) =>
    v < 5 ? '#f5f5f3' : v < 15 ? '#fff3cc' : v < 30 ? '#ffe54c' : v < 45 ? '#f5c800' : v < 55 ? '#BA7517' : '#854F0B';
const HEAT_SWATCHES = ['#f5f5f3', '#fff3cc', '#ffe54c', '#f5c800', '#BA7517', '#854F0B'];

const GEO_PINS = [
    { size: 50, bg: '#BA7517', color: '#fff', top: '20%', left: '34%', label: '5.2k', title: 'Metro Manila · 5,204 searches' },
    { size: 30, bg: '#ffe54c', color: '#171717', top: '53%', left: '62%', label: '1.3k', title: 'Cebu City · 1,304 searches' },
    { size: 24, bg: '#f5d800', color: '#171717', top: '68%', left: '52%', label: '812', title: 'Davao City · 812 searches' },
    { size: 20, bg: '#fff3cc', color: '#BA7517', top: '26%', left: '12%', label: '342', title: 'Iloilo · 342 searches' },
    { size: 18, bg: '#fff3cc', color: '#BA7517', top: '14%', left: '72%', label: '287', title: 'Cagayan · 287 searches' },
];

const PEAK_DATA = [12, 8, 5, 4, 3, 6, 18, 42, 68, 82, 76, 80, 88, 74, 71, 78, 92, 98, 86, 64, 48, 34, 24, 16];
const barColor = (v) => (v > 80 ? '#BA7517' : v > 60 ? '#ffe54c' : v > 40 ? '#fff3cc' : '#f0f0ee');

const CTR_ROWS = [
    { name: 'SM Mall of Asia', views: '4,821', rate: '68%', level: 'hi' },
    { name: 'Robinsons Galleria', views: '3,102', rate: '61%', level: 'hi' },
    { name: 'Ayala Center Cebu', views: '2,441', rate: '48%', level: 'md' },
    { name: 'Abreeza Mall Davao', views: '1,876', rate: '42%', level: 'md' },
    { name: 'SM Megamall', views: '1,654', rate: '39%', level: 'md' },
    { name: 'Puregold Cubao', views: '987', rate: '24%', level: 'lo' },
    { name: 'Mercury Drug Makati', views: '764', rate: '19%', level: 'lo' },
];

const TOP_LOCATIONS = [
    { name: 'SM Mall of Asia', pct: 100, count: '4,821' },
    { name: 'Robinsons Galleria', pct: 64, count: '3,102' },
    { name: 'Ayala Center Cebu', pct: 51, count: '2,441' },
    { name: 'Abreeza Mall Davao', pct: 39, count: '1,876' },
    { name: 'SM Megamall', pct: 34, count: '1,654' },
    { name: 'Puregold Cubao', pct: 20, count: '987' },
    { name: 'Mercury Drug Makati', pct: 16, count: '764' },
];

function buildLineChart(VIEWS_DATA) {
    const W = 320;
    const H = 110;
    const P = 10;
    const max = Math.max(...VIEWS_DATA);
    const min = Math.min(...VIEWS_DATA);
    const pts = VIEWS_DATA.map((v, i) => {
        const x = P + (i / (VIEWS_DATA.length - 1)) * (W - 2 * P);
        const y = H - P - ((v - min) / (max - min)) * (H - 2 * P);
        return { x, y };
    });
    const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${P},${H - P} ${line} ${W - P},${H - P}`;
    return { W, H, pts, line, area };
}

export default async function AnalyticsPage({ searchParams }) {

    const params = await searchParams;
    const range = params?.range ?? '30';
    const locator = params?.locator ?? 'all';

    const analyticsData = await getAnalyticsData({ range, locator });
    console.log(analyticsData);
    if(!analyticsData) {
        return <div>No dont have access to this page for your plan.</div>;
    }
    
    // Views over time
    const VIEWS_DATA = analyticsData.views_over_time.views_data;
    const VIEWS_LABELS = analyticsData.views_over_time.views_labels;

    // Device Breakdown
    const DEVICES = analyticsData.device_breakdown;

    // Search Activity Heatmap

    // Top Searched Cities
    const TOP_7_CITIES = analyticsData.top_7_cities;

    // Top Search Queries
    const TOP_QUERIES = analyticsData.top_exact_searches;



    // Helper functions
    const getDeviceIcon = (name) => {
        switch (name) {
            case 'Mobile':
                return <TbDeviceMobile />;
            case 'Desktop':
                return <TbDeviceLaptop />;
            case 'Tablet':
                return <TbDeviceTablet />;
        }
    }

    const { W, H, pts, line, area } = buildLineChart(VIEWS_DATA, VIEWS_LABELS);
    const peakMax = Math.max(...PEAK_DATA);

    return <>
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Analytics</h1>
                    <p>Dashboard <RiArrowRightLine /> Analytics</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.analytics}>

                        {/* TOOLBAR */}
                        <div className={styles.toolbar}>
                            <form className={styles.toolbarActions} method="get">
                                <select className={styles.select} name="locator" defaultValue={locator}>
                                    <option value="all">All Locators</option>
                                    <option value="main">Main Store Locator</option>
                                    <option value="branch">Branch Finder</option>
                                    <option value="popup">Pop-up Stores</option>
                                </select>
                                <select className={styles.select} name="range" defaultValue={range}>
                                    <option value="7">Last 7 days</option>
                                    <option value="30">Last 30 days</option>
                                    <option value="90">Last 90 days</option>
                                    <option value="365">Last 12 months</option>
                                </select>
                                <Button type="submit" value="Apply" />
                            </form>
                        </div>

                        {/* STAT CARDS */}
                        <div className={styles.statsGrid}>
                            {STATS.map((s) => (
                                <div key={s.label} className={styles.statCard}>
                                    <div className={styles.statLabel}>{s.icon} {s.label}</div>
                                    <div className={styles.statValue}>{s.value}</div>
                                    <div className={`${styles.statTrend} ${s.up ? styles.up : styles.down}`}>
                                        {s.up ? <TbTrendingUp /> : <TbTrendingDown />} {s.trend}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* VIEWS CHART + DEVICE */}
                        <div className={styles.twoCol}>
                            <div className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <TbChartLine /> Views Over Time
                                    <span className={`${styles.badge} ${styles.blue}`}>Pro + Business</span>
                                </div>
                                <svg className={styles.lineChart} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                                    <polygon points={area} fill="rgba(255,229,76,0.18)" />
                                    <polyline points={line} fill="none" stroke="#ffe54c" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                                    {pts.map((p, i) => (
                                        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#ffe54c" stroke="#fff" strokeWidth="1" />
                                    ))}
                                </svg>
                                <div className={styles.lineLabels}>
                                    {VIEWS_LABELS.map((l) => <span key={l}>{l}</span>)}
                                </div>
                            </div>
                            <div className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <TbDevices /> Device Breakdown
                                    <span className={`${styles.badge} ${styles.pro}`}>Business</span>
                                </div>
                                {DEVICES.map((d) => (
                                    <div key={d.name} className={styles.deviceRow}>
                                        <div className={styles.deviceIcon} style={{ background: d.bg, color: d.color }}>{getDeviceIcon(d.name)}</div>
                                        <div className={styles.deviceInfo}>
                                            <div className={styles.deviceName}>{d.name}</div>
                                            <div className={styles.deviceBar}>
                                                <div className={styles.deviceFill} style={{ width: `${d.pct}%`, background: d.fill }} />
                                            </div>
                                        </div>
                                        <div className={styles.devicePct}>{d.pct}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* HEATMAP */}
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>
                                <TbFlame /> Search Activity Heatmap — Peak Hours by Day
                                <span className={`${styles.badge} ${styles.pro}`}>Business</span>
                            </div>
                            <div className={styles.heatLegend}>
                                <span>Low</span>
                                <div className={styles.heatScale}>
                                    {HEAT_SWATCHES.map((c) => (
                                        <div key={c} className={styles.heatSwatch} style={{ background: c, border: c === '#f5f5f3' ? '1px solid #e5e5e3' : 'none' }} />
                                    ))}
                                </div>
                                <span>High</span>
                            </div>
                            <div className={styles.heatGrid}>
                                <div />
                                {HEAT_HOURS.map((h) => <div key={h} className={styles.heatHourLabel}>{h}</div>)}
                                {HEAT_DAYS.map((day, di) => (
                                    <Fragment key={day}>
                                        <div className={styles.heatDayLabel}>{day}</div>
                                        {HEAT_DATA[di].map((v, hi) => (
                                            <div
                                                key={`${day}-${hi}`}
                                                className={styles.heatCell}
                                                style={{ background: heatColor(v) }}
                                                title={`${day} ${HEAT_HOURS[hi]} — ${v} searches`}
                                            />
                                        ))}
                                    </Fragment>
                                ))}
                            </div>
                        </div>

                        {/* TOP CITIES + SEARCH QUERIES */}
                        <div className={styles.twoCol}>
                            <div className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <TbBuildingCommunity /> Top Searched Cities
                                    <span className={`${styles.badge} ${styles.blue}`}>Pro + Business</span>
                                </div>
                                <div className={styles.topList}>
                                    {TOP_7_CITIES.map((c, i) => (
                                        <div key={c.name} className={styles.topItem}>
                                            <span className={styles.topRank}>{i + 1}</span>
                                            <span className={styles.topName}>{c.name}</span>
                                            <div className={styles.topBarWrap}>
                                                <div className={styles.topBarFill} style={{ width: `${c.pct}%` }} />
                                            </div>
                                            <span className={styles.topCount}>{c.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <TbTags /> Top Search Queries
                                    <span className={`${styles.badge} ${styles.pro}`}>Business</span>
                                </div>
                                <div className={styles.cardSub}>Exact terms customers typed into your widget that shows result's.</div>
                                <div className={styles.queryTags}>
                                    {TOP_QUERIES.map((q) => (
                                        <div key={q.term} className={styles.queryTag}>
                                            {q.term} <span className={styles.queryCount}>{q.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* GEO MAP + PEAK HOURS */}
                        <div className={styles.twoCol}>
                            <div className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <TbMap2 /> Geographic Search Clusters
                                    <span className={`${styles.badge} ${styles.pro}`}>Business</span>
                                </div>
                                <div className={styles.geoMap}>
                                    <div className={styles.geoGrid} style={{ width: '100%', height: '3px', top: '38%', left: 0 }} />
                                    <div className={styles.geoGrid} style={{ width: '100%', height: '3px', top: '65%', left: 0 }} />
                                    <div className={styles.geoGrid} style={{ width: '3px', height: '100%', left: '42%', top: 0 }} />
                                    <div className={styles.geoGrid} style={{ width: '3px', height: '100%', left: '68%', top: 0 }} />
                                    {GEO_PINS.map((p) => (
                                        <div
                                            key={p.title}
                                            className={styles.geoPin}
                                            style={{ width: p.size, height: p.size, background: p.bg, color: p.color, top: p.top, left: p.left }}
                                            title={p.title}
                                        >
                                            {p.label}
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.geoHint}>Circle size = search volume · Hover pins for details</div>
                            </div>
                            <div className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <TbClock /> Peak Hours
                                    <span className={`${styles.badge} ${styles.pro}`}>Business</span>
                                </div>
                                <div className={styles.barChart}>
                                    {PEAK_DATA.map((v, i) => (
                                        <div
                                            key={i}
                                            className={styles.barCol}
                                            style={{ height: `${(v / peakMax) * 100}%`, background: barColor(v) }}
                                            title={`${i}:00 — ${v} searches`}
                                        />
                                    ))}
                                </div>
                                <div className={styles.barLabels}>
                                    <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>12AM</span>
                                </div>
                            </div>
                        </div>

                        {/* CTR + TOP STORES */}
                        <div className={styles.twoCol}>
                            <div className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <TbClick /> Click-through Rate by Store
                                    <span className={`${styles.badge} ${styles.pro}`}>Business</span>
                                </div>
                                <div className={styles.ctrHead}>
                                    <span className={styles.ctrHeadStore}>Store</span>
                                    <span className={styles.ctrHeadViews}>Views</span>
                                    <span className={styles.ctrHeadRate}>CTR</span>
                                </div>
                                {CTR_ROWS.map((r) => (
                                    <div key={r.name} className={styles.ctrRow}>
                                        <span className={styles.ctrName}>{r.name}</span>
                                        <span className={styles.ctrViews}>{r.views}</span>
                                        <span className={`${styles.ctrRate} ${styles[r.level]}`}>{r.rate}</span>
                                    </div>
                                ))}
                            </div>
                            <div className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <TbMapPin /> Most Viewed Locations
                                    <span className={`${styles.badge} ${styles.blue}`}>Pro + Business</span>
                                </div>
                                <div className={styles.topList}>
                                    {TOP_LOCATIONS.map((l, i) => (
                                        <div key={l.name} className={styles.topItem}>
                                            <span className={styles.topRank}>{i + 1}</span>
                                            <span className={styles.topName}>{l.name}</span>
                                            <div className={styles.topBarWrap}>
                                                <div className={styles.topBarFill} style={{ width: `${l.pct}%` }} />
                                            </div>
                                            <span className={styles.topCount}>{l.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </>
}
