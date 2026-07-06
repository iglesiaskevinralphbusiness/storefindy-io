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
import GeoClusterMap from '@/components/Dashboard/GeoClusterMap';
import { HEAT_DAYS } from '@/utils/constant';
import { getLocators } from '@/actions/locator';

const heatColor = (v) =>
    v < 5 ? '#f5f5f3' : v < 15 ? '#fff3cc' : v < 30 ? '#ffe54c' : v < 45 ? '#f5c800' : v < 55 ? '#BA7517' : '#854F0B';
const HEAT_SWATCHES = ['#f5f5f3', '#fff3cc', '#ffe54c', '#f5c800', '#BA7517', '#854F0B'];


const barColor = (v) => (v > 80 ? '#BA7517' : v > 60 ? '#ffe54c' : v > 40 ? '#fff3cc' : '#f0f0ee');

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

export default async function AnalyticsPage({ searchParams }) {
    const locators = await getLocators();

    const params = await searchParams;
    const range = params?.range ?? '30';
    const locator = params?.locator ?? 'all';

    const analyticsData = await getAnalyticsData({ range, locator });
    if(!analyticsData) {
        return <div>No dont have access to this page for your plan.</div>;
    }

    // Statistics
    const STAT_ICONS = {
        widget_views: <TbEye />,
        total_searches: <TbSearch />,
        location_views: <TbMapPin />,
        avg_click_through: <TbClick />,
    };
    const STATS = [
        { key: 'widget_views', ...analyticsData.statistics.widget_views },
        { key: 'total_searches', ...analyticsData.statistics.total_searches },
        { key: 'location_views', ...analyticsData.statistics.location_views },
        { key: 'avg_click_through', ...analyticsData.statistics.avg_click_through },
    ].map((s) => ({ ...s, icon: STAT_ICONS[s.key] }));
    
    // Views over time
    const VIEWS_DATA = analyticsData.views_over_time.views_data;
    const VIEWS_LABELS = analyticsData.views_over_time.views_labels;

    // Device Breakdown
    const DEVICES = analyticsData.device_breakdown;

    // Top Searched Cities
    const TOP_7_CITIES = analyticsData.top_7_cities;

    // Top Search Queries
    const TOP_QUERIES = analyticsData.top_exact_searches;

    // Geographic Search Clusters
    const GEO_CLUSTERS = analyticsData.geo_clusters;

    // Search Activity Heatmap
    const HEAT_HOURS = analyticsData.heatmap.heat_hours;
    const HEAT_DATA = analyticsData.heatmap.heat_data;

    // Peak Hours
    const PEAK_DATA = analyticsData.peak_hours;

    // Most Viewed Locations
    const TOP_LOCATIONS = analyticsData.most_viewed_locations;

    // Click-through Rate by Store
    const CTR_ROWS = analyticsData.click_through_rate_by_store;

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
                                    {
                                        locators.map((l) => (
                                            <option key={l._id} value={l._id}>{l.name}</option>
                                        ))
                                    }
                                </select>
                                <select className={styles.select} name="range" defaultValue={range}>
                                    <option value="1">Today</option>
                                    <option value="7">Last 7 days</option>
                                    <option value="30">Last 30 days</option>
                                    <option value="90">Last 90 days</option>
                                    <option value="365">Last 12 months</option>
                                </select>
                                <Button type="submit" value="Apply" />
                            </form>
                        </div>

                        <div className={styles.analyticsHint}>
                            Only embedded widgets and subdomains are recorded. Any actions performed on the Customize page are not recorded in your analytics.
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
                                    <GeoClusterMap clusters={GEO_CLUSTERS} />
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
