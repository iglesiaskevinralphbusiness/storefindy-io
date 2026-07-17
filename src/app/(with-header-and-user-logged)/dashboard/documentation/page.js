import styles from '../Dashboard.module.scss';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from 'react-icons/ri';
import {
    TbBook,
    TbRocket,
    TbMapPin,
    TbMapPinPlus,
    TbPalette,
    TbUpload,
    TbCode,
    TbWorld,
    TbChartBar,
    TbUser,
    TbCreditCard,
    TbLifebuoy,
    TbHelpCircle,
    TbBulb,
    TbInfoCircle,
    TbAlertTriangle,
    TbCheck,
    TbSparkles,
    TbBug,
    TbMail,
} from 'react-icons/tb';

// Storefindy user documentation. Static content, so this stays a server
// component — the in-page anchor links (#section-id) work without any JS.
export default function DocumentationPage() {
    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Documentation</h1>
                    <p>Dashboard <RiArrowRightLine /> Documentation</p>
                </div>
                <div className={styles.body}>
                    <div className={styles.documentation}>

                        {/* HERO */}
                        <div className={styles.docHero}>
                            <div className={styles.docHeroIcon}>
                                <TbBook />
                            </div>
                            <h2>Storefindy Documentation</h2>
                            <p>
                                Everything you need to build, customize, and embed a beautiful store
                                locator on your website. Follow the guides below to go from an empty
                                dashboard to a live, searchable map of all your locations.
                            </p>
                            <div className={styles.docHeroMeta}>
                                <span><TbRocket /> Quick start in 5 steps</span>
                                <span><TbSparkles /> No code required</span>
                            </div>
                        </div>

                        {/* TABLE OF CONTENTS */}
                        <div className={styles.docToc}>
                            <div className={styles.docTocTitle}>On this page</div>
                            <div className={styles.docTocGrid}>
                                <a href="#getting-started"><TbRocket /><span>Getting Started</span><span className={styles.docTocNum}>01</span></a>
                                <a href="#locators"><TbMapPin /><span>Creating a Locator</span><span className={styles.docTocNum}>02</span></a>
                                <a href="#customize"><TbPalette /><span>Customizing the Widget</span><span className={styles.docTocNum}>03</span></a>
                                <a href="#locations"><TbMapPinPlus /><span>Adding Locations</span><span className={styles.docTocNum}>04</span></a>
                                <a href="#import-csv"><TbUpload /><span>Importing via CSV</span><span className={styles.docTocNum}>05</span></a>
                                <a href="#embed"><TbCode /><span>Embedding on Your Site</span><span className={styles.docTocNum}>06</span></a>
                                <a href="#subdomains"><TbWorld /><span>Custom Subdomains</span><span className={styles.docTocNum}>07</span></a>
                                <a href="#analytics"><TbChartBar /><span>Analytics &amp; Insights</span><span className={styles.docTocNum}>08</span></a>
                                <a href="#account"><TbUser /><span>Account &amp; Profile</span><span className={styles.docTocNum}>09</span></a>
                                <a href="#billing"><TbCreditCard /><span>Plans &amp; Billing</span><span className={styles.docTocNum}>10</span></a>
                                <a href="#support"><TbLifebuoy /><span>Support</span><span className={styles.docTocNum}>11</span></a>
                                <a href="#faq"><TbHelpCircle /><span>FAQ</span><span className={styles.docTocNum}>12</span></a>
                            </div>
                        </div>

                        {/* 01 — GETTING STARTED */}
                        <section id="getting-started" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbRocket /></div>
                                <div>
                                    <h3>Getting Started</h3>
                                    <div className={styles.docSectionSub}>From sign-up to a live locator in minutes</div>
                                </div>
                            </div>
                            <p>
                                Storefindy lets you create an interactive, searchable store locator and
                                embed it anywhere — your website, a landing page, or a custom subdomain.
                                A <strong>locator</strong> is the map widget itself; <strong>locations</strong> are
                                the individual stores, branches, or points that appear inside it.
                            </p>
                            <h4><TbCheck /> The 5-step quick start</h4>
                            <div className={styles.docSteps}>
                                <div className={styles.docStep}>
                                    <div className={styles.docStepNum}>1</div>
                                    <div className={styles.docStepBody}>
                                        <div className={styles.docStepTitle}>Create a locator</div>
                                        <div className={styles.docStepDesc}>Go to <strong>Locator → Create Locator</strong>, name it, and set your default map view.</div>
                                    </div>
                                </div>
                                <div className={styles.docStep}>
                                    <div className={styles.docStepNum}>2</div>
                                    <div className={styles.docStepBody}>
                                        <div className={styles.docStepTitle}>Add your locations</div>
                                        <div className={styles.docStepDesc}>Add stores one at a time under <strong>Locations → Add Location</strong>, or bulk import them with a CSV file.</div>
                                    </div>
                                </div>
                                <div className={styles.docStep}>
                                    <div className={styles.docStepNum}>3</div>
                                    <div className={styles.docStepBody}>
                                        <div className={styles.docStepTitle}>Customize the look</div>
                                        <div className={styles.docStepDesc}>Open <strong>Customize Locator</strong> to match your brand — colors, fonts, pins, and layout with a live preview.</div>
                                    </div>
                                </div>
                                <div className={styles.docStep}>
                                    <div className={styles.docStepNum}>4</div>
                                    <div className={styles.docStepBody}>
                                        <div className={styles.docStepTitle}>Embed it</div>
                                        <div className={styles.docStepDesc}>Copy the embed snippet from <strong>Embed Locator</strong> and paste it into your website.</div>
                                    </div>
                                </div>
                                <div className={styles.docStep}>
                                    <div className={styles.docStepNum}>5</div>
                                    <div className={styles.docStepBody}>
                                        <div className={styles.docStepTitle}>Track performance</div>
                                        <div className={styles.docStepDesc}>Watch views, searches, and clicks roll in under <strong>Analytics</strong>.</div>
                                    </div>
                                </div>
                            </div>
                            <div className={`${styles.docNote} ${styles.tip}`}>
                                <TbBulb />
                                <p>New here? Your <strong>Dashboard</strong> home shows your locators, live stats, a quick-embed snippet, and your plan usage all in one place.</p>
                            </div>
                        </section>

                        {/* 02 — LOCATORS */}
                        <section id="locators" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbMapPin /></div>
                                <div>
                                    <h3>Creating a Locator</h3>
                                    <div className={styles.docSectionSub}>Locator → Create Locator</div>
                                </div>
                            </div>
                            <p>
                                A locator is the container for your map. You can run several locators from
                                one account — for example, one per brand, region, or website. Manage them
                                all under <strong>Locator → All Locators</strong>.
                            </p>
                            <h4><TbInfoCircle /> Settings you’ll configure</h4>
                            <table className={styles.docTable}>
                                <thead>
                                    <tr><th>Group</th><th>Field</th><th>What it does</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td><strong>Basic Information</strong></td><td>Locator Name <em>(required)</em></td><td>An internal name (customers never see it) so you can tell your locators apart, e.g. <code>Main Store Locator</code>.</td></tr>
                                    <tr><td></td><td>Locator Description</td><td>Optional note describing what this locator is for.</td></tr>
                                    <tr><td></td><td>Default Language</td><td>The widget interface language — <strong>English</strong> or <strong>Français</strong>.</td></tr>
                                    <tr><td><strong>Default Map View</strong></td><td>Default Country</td><td>Where the map centers on load (used when auto-detect location is off).</td></tr>
                                    <tr><td></td><td>Default Zoom Level</td><td>Starting zoom — <strong>City</strong>, <strong>State</strong>, <strong>Country</strong>, or <strong>World</strong> level.</td></tr>
                                    <tr><td><strong>Search Settings</strong></td><td>Search Radius</td><td>Default distance searched around a visitor — <code>10</code>, <code>25</code>, <code>50</code>, or <code>100</code> miles.</td></tr>
                                    <tr><td></td><td>Maximum Results Shown</td><td>Caps results in the list — <code>5</code>, <code>10</code>, <code>25</code>, <code>50</code>, or <strong>All</strong>.</td></tr>
                                    <tr><td><strong>Filters / Categories</strong></td><td>Filter titles</td><td>Tags visitors can filter by, e.g. <code>Free Wifi</code>, <code>Free Parking</code>, <code>Wheelchair Accessible</code>.</td></tr>
                                </tbody>
                            </table>
                            <h4><TbCheck /> Widget features (toggle on/off)</h4>
                            <ul>
                                <li><strong>Search bar</strong> — let visitors search by address or place.</li>
                                <li><strong>Detect my location</strong> — a one-tap “find stores near me” button.</li>
                                <li><strong>Show filters</strong> — display your filter/category chips.</li>
                                <li><strong>Show search radius</strong> — show the distance indicator on the map.</li>
                                <li><strong>Show store list</strong> — a scrollable list next to the map.</li>
                                <li><strong>Show directions button</strong> — link each store to turn-by-turn directions.</li>
                                <li><strong>Show store hours</strong> — display opening hours in each store card.</li>
                                <li><strong>Powered by Storefindy</strong> — the branding badge (removable on the Business plan).</li>
                            </ul>
                        </section>

                        {/* 03 — CUSTOMIZE */}
                        <section id="customize" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbPalette /></div>
                                <div>
                                    <h3>Customizing the Widget</h3>
                                    <div className={styles.docSectionSub}>Locator → Customize Locator</div>
                                </div>
                            </div>
                            <p>
                                The customizer gives you a <strong>live preview</strong> that updates as you edit,
                                with <strong>desktop and mobile</strong> views so you can check both. Changes are scoped
                                to the locator you select.
                            </p>
                            <h4><TbInfoCircle /> What you can style</h4>
                            <ul>
                                <li><strong>Typography</strong> — Font Family (System Default, Arial, Helvetica, Georgia, Times New Roman, Courier New, Roboto, Poppins) and Root Font Size.</li>
                                <li><strong>Search bar</strong> — form style, placeholder text, background, border, text color, and the search icon.</li>
                                <li><strong>Filters &amp; list</strong> — background, border, text, plus active/selected states for chips and the store list.</li>
                                <li><strong>Map markers</strong> — choose a <strong>Standard Pin</strong> or upload a <strong>Custom Image</strong>, set the pin color and size, and optionally show pin numbers on the map.</li>
                                <li><strong>Map behavior</strong> — show a radius indicator and zoom in automatically when a location is selected.</li>
                                <li><strong>Sizing</strong> — preset widths such as Small (500px), Medium (665px), and Large (765px).</li>
                            </ul>
                            <div className={`${styles.docNote} ${styles.info}`}>
                                <TbInfoCircle />
                                <p>How much you can customize depends on your plan — <strong>Basic</strong> on Free, <strong>Semi</strong> on Pro, and <strong>Full</strong> customization on Business. <strong>Custom pin images</strong> require Pro or Business (PNG/SVG/JPEG/GIF, max 500&nbsp;KB, ~32×32px), and the multiple <strong>form styles</strong> are Business-only. Use <strong>Save Changes</strong> to apply — you’ll be warned before leaving with unsaved edits.</p>
                            </div>
                        </section>

                        {/* 04 — LOCATIONS */}
                        <section id="locations" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbMapPinPlus /></div>
                                <div>
                                    <h3>Adding Locations</h3>
                                    <div className={styles.docSectionSub}>Locations → Add Location</div>
                                </div>
                            </div>
                            <p>
                                Locations are the pins on your map. Add them individually here, or import
                                many at once via CSV (see below). Every location belongs to a locator, which
                                you pick as you create it. Manage them all under <strong>Locations → All Locations</strong>.
                            </p>
                            <table className={styles.docTable}>
                                <thead>
                                    <tr><th>Group</th><th>Fields</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td><strong>Basic Information</strong></td><td>Store Name <em>(required)</em>, Locator, Description.</td></tr>
                                    <tr><td><strong>Address Details</strong></td><td>Street Address, City, State / Province, Postal Code, Country.</td></tr>
                                    <tr><td><strong>Pin Location on Map</strong></td><td>Latitude &amp; Longitude — or search an address to auto-fill the coordinates.</td></tr>
                                    <tr><td><strong>Business Hours</strong></td><td>Location status plus opening hours for each day of the week.</td></tr>
                                    <tr><td><strong>Holiday / Special Hours</strong></td><td>Override hours for specific dates.</td></tr>
                                    <tr><td><strong>Contact &amp; Links</strong></td><td>Phone, Email, Website URL, View Location URL, and social links (Facebook, etc.).</td></tr>
                                    <tr><td><strong>Location Settings</strong></td><td>Published toggle, Show Store Hours, and Custom Notes.</td></tr>
                                </tbody>
                            </table>
                            <div className={`${styles.docNote} ${styles.tip}`}>
                                <TbBulb />
                                <p>Don’t know a store’s exact coordinates? Click anywhere on the map to drop a pin, or type the address into the map search — Storefindy fills in the latitude and longitude for you.</p>
                            </div>
                            <div className={`${styles.docNote} ${styles.info}`}>
                                <TbInfoCircle />
                                <p><strong>Required to save:</strong> Store Name, Locator, City, State/Province, and the map coordinates (Latitude &amp; Longitude). Any field you leave blank simply won’t be shown in the widget. You need at least one locator before you can add a location.</p>
                            </div>
                        </section>

                        {/* 05 — IMPORT CSV */}
                        <section id="import-csv" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbUpload /></div>
                                <div>
                                    <h3>Importing Locations via CSV</h3>
                                    <div className={styles.docSectionSub}>Locations → Import CSV</div>
                                </div>
                            </div>
                            <p>
                                Have a lot of stores? Upload them in bulk. The importer is a four-step wizard:
                                {' '}<strong>Select locator &amp; mode → Upload → Map Fields → Preview &amp; Import</strong>.
                                Storefindy auto-matches your column headers to the right fields, and you can
                                adjust anything that doesn’t line up. Each CSV imports into exactly one locator.
                            </p>
                            <h4><TbInfoCircle /> Import modes</h4>
                            <ul>
                                <li><strong>Append</strong> — add the new locations alongside existing ones; nothing is deleted.</li>
                                <li><strong>Replace All</strong> — delete every existing location in the locator and replace it with the CSV.</li>
                                <li><strong>Update Existing</strong> — update locations that match by name, and add any new ones.</li>
                            </ul>
                            <h4><TbCheck /> Recommended column format</h4>
                            <div className={styles.docCode}>
                                <div className={styles.docCodeTop}>
                                    <span className={styles.docCodeLang}>storefindy_template.csv</span>
                                    <span className={styles.docCodeDots}><span></span><span></span><span></span></span>
                                </div>
                                <pre>{`name,city,state,country,lat,lng,phone,email,website
Walmart Supercenter,New York,NY,US,40.7128,-74.0060,+1-212-000-0000,store@example.com,https://example.com`}</pre>
                            </div>
                            <ul>
                                <li>Download the pre-formatted template — it has every supported column ready for Excel or Google Sheets.</li>
                                <li><strong>Required columns:</strong> <code>name</code>, <code>city</code>, <code>state</code>, <code>country</code>, <code>lat</code>, <code>lng</code>. <strong>Optional:</strong> <code>phone</code>, <code>email</code>, <code>website</code>.</li>
                                <li>Files must be <strong>.csv</strong> and under <strong>5&nbsp;MB</strong>.</li>
                                <li>On Map Fields, match each detected column to a Storefindy field (or skip the ones you don’t need).</li>
                                <li>The Preview step flags each row as <strong>Ready</strong>, <strong>Warning</strong>, or <strong>Error</strong>. Rows missing a required value or with non-numeric coordinates are skipped; an unrecognized country falls back to the United States.</li>
                            </ul>
                        </section>

                        {/* 06 — EMBED */}
                        <section id="embed" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbCode /></div>
                                <div>
                                    <h3>Embedding on Your Website</h3>
                                    <div className={styles.docSectionSub}>Locator → Embed Locator</div>
                                </div>
                            </div>
                            <p>
                                Embedding is two lines of code — a custom <code>&lt;locator-widget&gt;</code> tag
                                and the Storefindy script. The <code>locator</code> attribute is your locator’s ID,
                                which is filled in for you on the Embed page and on your Dashboard’s quick-embed card.
                            </p>
                            <div className={styles.docCode}>
                                <div className={styles.docCodeTop}>
                                    <span className={styles.docCodeLang}>HTML</span>
                                    <span className={styles.docCodeDots}><span></span><span></span><span></span></span>
                                </div>
                                <pre>{`<locator-widget locator="YOUR_LOCATOR_ID"></locator-widget>
<script src="https://storefindy.com/widgets.js"></script>`}</pre>
                            </div>
                            <h4><TbInfoCircle /> Where to paste it</h4>
                            <ul>
                                <li><strong>HTML / any site</strong> — drop both lines where you want the map to appear.</li>
                                <li><strong>WordPress</strong> — add a Custom HTML block and paste the snippet in.</li>
                                <li><strong>Shopify</strong> — add a Custom Liquid / HTML section to the page.</li>
                                <li><strong>React, Vue, Angular</strong> — the Embed page gives you framework-specific snippets for each.</li>
                            </ul>
                            <div className={`${styles.docNote} ${styles.info}`}>
                                <TbInfoCircle />
                                <p>Load the <code>widgets.js</code> script once per page, even if you embed more than one locator. Any changes you make in the dashboard appear automatically — no need to re-paste the code.</p>
                            </div>
                        </section>

                        {/* 07 — SUBDOMAINS */}
                        <section id="subdomains" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbWorld /></div>
                                <div>
                                    <h3>Custom Subdomains</h3>
                                    <div className={styles.docSectionSub}>Locator → Custom Subdomains</div>
                                </div>
                            </div>
                            <p>
                                No website to embed into? Give your locator its own hosted page at
                                {' '}<code>yourbusinessname.storefindy.com</code>. Create a subdomain, assign it to a
                                locator, and share the link directly.
                            </p>
                            <table className={styles.docTable}>
                                <thead>
                                    <tr><th>Group</th><th>Fields</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td><strong>Sub Domain Assignment</strong></td><td>Sub Domain Name — 3–30 lowercase letters, numbers, or hyphens (e.g. <code>my-pharmacy</code>), checked for availability — and the locator it points to.</td></tr>
                                    <tr><td><strong>SEO Settings</strong></td><td>Page Title, Page Description (used as meta title/description for search engines and social sharing), and a favicon upload.</td></tr>
                                    <tr><td><strong>Header &amp; Footer</strong></td><td>Custom Header HTML, Footer HTML, Custom CSS, and Custom JS to fully brand the page.</td></tr>
                                </tbody>
                            </table>
                            <div className={`${styles.docNote} ${styles.info}`}>
                                <TbInfoCircle />
                                <p>The number of subdomains you can create depends on your plan: <strong>1</strong> on Free, <strong>3</strong> on Pro, and <strong>7</strong> on Business.</p>
                            </div>
                        </section>

                        {/* 08 — ANALYTICS */}
                        <section id="analytics" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbChartBar /></div>
                                <div>
                                    <h3>Analytics &amp; Insights</h3>
                                    <div className={styles.docSectionSub}>Main → Analytics</div>
                                </div>
                            </div>
                            <p>
                                See how visitors use your locator. Filter by a single locator or view all of
                                them together. Analytics includes:
                            </p>
                            <ul>
                                <li><strong>Views over time</strong> — widget loads across the selected period.</li>
                                <li><strong>Search activity heatmap</strong> — busiest days and hours at a glance.</li>
                                <li><strong>Top searched cities</strong> and <strong>top search queries</strong>.</li>
                                <li><strong>Geographic search clusters</strong> — where demand is concentrated.</li>
                                <li><strong>Searches by hour</strong> of the day.</li>
                                <li><strong>Click-through rate by store</strong> and <strong>most viewed locations</strong>.</li>
                            </ul>
                            <div className={`${styles.docNote} ${styles.warn}`}>
                                <TbAlertTriangle />
                                <p>Analytics is not available on the <strong>Free</strong> plan. <strong>Pro</strong> unlocks basic analytics, and the <strong>heatmap, search queries, geographic clusters, and click-through insights</strong> are part of the <strong>Business</strong> plan.</p>
                            </div>
                            <div className={`${styles.docNote} ${styles.info}`}>
                                <TbInfoCircle />
                                <p>Only <strong>embedded widgets and subdomains</strong> record analytics. Anything you do inside the Customize preview is not counted.</p>
                            </div>
                        </section>

                        {/* 09 — ACCOUNT */}
                        <section id="account" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbUser /></div>
                                <div>
                                    <h3>Account &amp; Profile</h3>
                                    <div className={styles.docSectionSub}>Account → Profile</div>
                                </div>
                            </div>
                            <p>
                                Manage your personal and business details under <strong>Account → Profile</strong>:
                                First name, Last name, Display name, Company, Country, and Timezone. Your account
                                email is shown as read-only.
                            </p>
                            <ul>
                                <li><strong>API Access</strong> — manage API keys for programmatic access (Business plan).</li>
                                <li><strong>Notifications</strong> — control the alerts and emails you receive.</li>
                                <li><strong>Export my data</strong> — download a copy of your account data.</li>
                                <li><strong>Delete my account</strong> — permanently remove your account and its data.</li>
                            </ul>
                            <div className={`${styles.docNote} ${styles.warn}`}>
                                <TbAlertTriangle />
                                <p>Deleting your account is permanent — locators, locations, and analytics are removed and can’t be recovered.</p>
                            </div>
                        </section>

                        {/* 10 — BILLING */}
                        <section id="billing" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbCreditCard /></div>
                                <div>
                                    <h3>Plans &amp; Billing</h3>
                                    <div className={styles.docSectionSub}>Account → Billing</div>
                                </div>
                            </div>
                            <p>
                                Compare plans, upgrade or downgrade, and manage payment details on the Billing
                                page. Here’s what each plan includes:
                            </p>
                            <table className={styles.docTable}>
                                <thead>
                                    <tr><th>Plan</th><th>Price</th><th>Locators</th><th>Locations</th><th>Subdomains</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td><strong>Free</strong></td><td>$0/mo</td><td>1</td><td>20</td><td>1</td></tr>
                                    <tr><td><strong>Pro</strong></td><td>$10/mo</td><td>3</td><td>500</td><td>3</td></tr>
                                    <tr><td><strong>Business</strong></td><td>$30/mo</td><td>10</td><td>Unlimited</td><td>7</td></tr>
                                </tbody>
                            </table>
                            <div className={styles.docPlanRow}>
                                <span className={`${styles.docPlanPill} ${styles.free}`}><TbMapPin /> Free — CSV import, basic customization, embed</span>
                                <span className={`${styles.docPlanPill} ${styles.pro}`}><TbSparkles /> Pro — basic analytics, no branding limits</span>
                                <span className={`${styles.docPlanPill} ${styles.biz}`}><TbChartBar /> Business — heatmap, API, priority support</span>
                            </div>
                            <p>
                                The <strong>Business</strong> plan adds advanced analytics &amp; heatmap, API access,
                                the ability to remove Storefindy branding, and priority support. Payments and
                                invoices are handled securely through our billing provider (Lemon Squeezy) — open the
                                billing portal from this page to update your card, change plan, download invoices,
                                or cancel. Use <strong>Sync</strong> if your plan looks out of date after a change.
                            </p>
                            <div className={`${styles.docNote} ${styles.info}`}>
                                <TbInfoCircle />
                                <p>Downgrading never deletes your data. If you exceed a plan’s limits, the oldest items within the limit stay live and the extras become <strong>inactive</strong> (hidden from the public widget) until you upgrade again.</p>
                            </div>
                        </section>

                        {/* 11 — SUPPORT */}
                        <section id="support" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbLifebuoy /></div>
                                <div>
                                    <h3>Support</h3>
                                    <div className={styles.docSectionSub}>Support → Help &amp; Report Bug</div>
                                </div>
                            </div>
                            <ul>
                                <li><strong>Help and Support</strong> — browse guides and reach the team when you’re stuck.</li>
                                <li><strong>Report Bug</strong> — found something broken? Report it with a severity level and Storefindy attaches your system info to help us debug faster.</li>
                            </ul>
                            <div className={`${styles.docNote} ${styles.tip}`}>
                                <TbBulb />
                                <p>Include the locator name and the page URL where you saw the issue — it helps us reproduce and fix things much faster.</p>
                            </div>
                        </section>

                        {/* 12 — FAQ */}
                        <section id="faq" className={styles.docSection}>
                            <div className={styles.docSectionHead}>
                                <div className={styles.docSectionIcon}><TbHelpCircle /></div>
                                <div>
                                    <h3>Frequently Asked Questions</h3>
                                    <div className={styles.docSectionSub}>Quick answers to common questions</div>
                                </div>
                            </div>
                            <div className={styles.docFaq}>
                                <div className={styles.docFaqItem}>
                                    <div className={styles.docFaqQ}><TbHelpCircle /> What’s the difference between a locator and a location?</div>
                                    <div className={styles.docFaqA}>A <strong>locator</strong> is the map widget you embed. <strong>Locations</strong> are the individual stores or points that appear inside it. One locator can hold many locations.</div>
                                </div>
                                <div className={styles.docFaqItem}>
                                    <div className={styles.docFaqQ}><TbHelpCircle /> Do I need to know how to code to embed my locator?</div>
                                    <div className={styles.docFaqA}>No. Copy the two-line snippet from the Embed page and paste it into your site builder’s HTML block. We provide ready-made snippets for WordPress, Shopify, React, Vue, and Angular too.</div>
                                </div>
                                <div className={styles.docFaqItem}>
                                    <div className={styles.docFaqQ}><TbHelpCircle /> Will my changes update automatically after embedding?</div>
                                    <div className={styles.docFaqA}>Yes. The widget always reflects your latest dashboard settings, so edits to design or locations appear live — no need to re-paste the code.</div>
                                </div>
                                <div className={styles.docFaqItem}>
                                    <div className={styles.docFaqQ}><TbHelpCircle /> Can I import my existing store list?</div>
                                    <div className={styles.docFaqA}>Yes. Use <strong>Import CSV</strong>, download the template, fill it in, and map your columns. Files must be .csv and under 5&nbsp;MB.</div>
                                </div>
                                <div className={styles.docFaqItem}>
                                    <div className={styles.docFaqQ}><TbHelpCircle /> How do I remove the “Powered by Storefindy” badge?</div>
                                    <div className={styles.docFaqA}>Branding removal is included on the <strong>Business</strong> plan. Upgrade from the Billing page to hide the badge.</div>
                                </div>
                                <div className={styles.docFaqItem}>
                                    <div className={styles.docFaqQ}><TbHelpCircle /> What happens if I hit my plan limits?</div>
                                    <div className={styles.docFaqA}>You’ll be prompted to upgrade when you reach your locator, location, or subdomain caps. Existing data stays intact — you just can’t add more until you upgrade.</div>
                                </div>
                            </div>
                        </section>

                        {/* SUPPORT FOOTER */}
                        <div className={styles.docSupport}>
                            <div className={styles.docSupportIcon}><TbLifebuoy /></div>
                            <div className={styles.docSupportInfo}>
                                <div className={styles.docSupportTitle}>Still need a hand?</div>
                                <div className={styles.docSupportDesc}>Our team is happy to help you get your locator live.</div>
                            </div>
                            <div className={styles.docSupportActions}>
                                <a href="/dashboard/help-and-support" className={`${styles.docSupportBtn} ${styles.dark}`}><TbMail /> Contact support</a>
                                <a href="/dashboard/report-bug" className={`${styles.docSupportBtn} ${styles.light}`}><TbBug /> Report a bug</a>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
