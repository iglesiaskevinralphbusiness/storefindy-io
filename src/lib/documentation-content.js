// The Storefindy user documentation, as data.
//
// WHY IT MOVED OUT OF THE PAGE
// The documentation assistant answers only from what this documentation says,
// which means it needs the documentation as text. Keeping a second copy of the
// prose for it to search would guarantee the two drift apart, and an assistant
// quoting last month's wording is worse than no assistant. So the copy lives
// here once: the page renders it (see components/Dashboard/Documentation), and
// the assistant searches the very same strings.
//
// INLINE MARKUP
// Text uses a deliberately tiny syntax so the data stays readable and produces
// clean plain text for search with no HTML to strip:
//   **bold**    -> <strong>
//   `code`      -> <code>
//   _emphasis_  -> <em>
// Nothing else is interpreted, and none of it is ever rendered as raw HTML —
// see renderRichText() in the renderer, which builds React elements.
//
// BLOCK TYPES
//   { type: 'p',     text }
//   { type: 'h4',    icon, text }
//   { type: 'ul',    items: [text] }
//   { type: 'table', head: [text], rows: [[text]] }
//   { type: 'note',  tone: 'tip'|'info'|'warn', text }
//   { type: 'code',  lang, body }
//   { type: 'steps', items: [{ title, desc }] }
//   { type: 'plans', items: [{ tone, icon, text }] }
//   { type: 'faq',   items: [{ q, a }] }

/** Non-breaking space, for the unit pairs that shouldn't wrap. */
const NB = ' ';

export const DOC_SECTIONS = [
    {
        id: 'getting-started',
        num: '01',
        icon: 'rocket',
        title: 'Getting Started',
        sub: 'From sign-up to a live locator in minutes',
        tocLabel: 'Getting Started',
        blocks: [
            {
                type: 'p',
                text: 'Storefindy lets you create an interactive, searchable store locator and embed it anywhere — your website, a landing page, or a custom subdomain. A **locator** is the map widget itself; **locations** are the individual stores, branches, or points that appear inside it.',
            },
            { type: 'h4', icon: 'check', text: 'The 5-step quick start' },
            {
                type: 'steps',
                items: [
                    { title: 'Create a locator', desc: 'Go to **Locator → Create Locator**, name it, and set your default map view.' },
                    { title: 'Add your locations', desc: 'Add stores one at a time under **Locations → Add Location**, or bulk import them with a CSV file.' },
                    { title: 'Customize the look', desc: 'Open **Customize Locator** to match your brand — colors, fonts, pins, and layout with a live preview.' },
                    { title: 'Embed it', desc: 'Copy the embed snippet from **Embed Locator** and paste it into your website.' },
                    { title: 'Track performance', desc: 'Watch views, searches, and clicks roll in under **Analytics**.' },
                ],
            },
            {
                type: 'note',
                tone: 'tip',
                text: 'New here? Your **Dashboard** home shows your locators, live stats, a quick-embed snippet, and your plan usage all in one place.',
            },
        ],
    },

    {
        id: 'locators',
        num: '02',
        icon: 'pin',
        title: 'Creating a Locator',
        sub: 'Locator → Create Locator',
        tocLabel: 'Creating a Locator',
        blocks: [
            {
                type: 'p',
                text: 'A locator is the container for your map. You can run several locators from one account — for example, one per brand, region, or website. Manage them all under **Locator → All Locators**.',
            },
            { type: 'h4', icon: 'info', text: 'Settings you’ll configure' },
            {
                type: 'table',
                head: ['Group', 'Field', 'What it does'],
                rows: [
                    ['**Basic Information**', 'Locator Name _(required)_', 'An internal name (customers never see it) so you can tell your locators apart, e.g. `Main Store Locator`.'],
                    ['', 'Locator Description', 'Optional note describing what this locator is for.'],
                    ['', 'Default Language', 'The widget interface language — **English** or **Français**.'],
                    ['**Default Map View**', 'Default Country', 'Where the map centers on load (used when auto-detect location is off).'],
                    ['', 'Default Zoom Level', 'Starting zoom — **City**, **State**, **Country**, or **World** level.'],
                    ['**Search Settings**', 'Search Radius', 'Default distance searched around a visitor — `10`, `25`, `50`, or `100` miles.'],
                    ['', 'Maximum Results Shown', 'Caps results in the list — `5`, `10`, `25`, `50`, or **All**.'],
                    ['**Filters / Categories**', 'Filter titles', 'Tags visitors can filter by, e.g. `Free Wifi`, `Free Parking`, `Wheelchair Accessible`.'],
                ],
            },
            { type: 'h4', icon: 'check', text: 'Widget features (toggle on/off)' },
            {
                type: 'ul',
                items: [
                    '**Search bar** — let visitors search by address or place.',
                    '**Detect my location** — a one-tap “find stores near me” button.',
                    '**Show filters** — display your filter/category chips.',
                    '**Show search radius** — show the distance indicator on the map.',
                    '**Show store list** — a scrollable list next to the map.',
                    '**Show directions button** — link each store to turn-by-turn directions.',
                    '**Show store hours** — display opening hours in each store card.',
                    '**Powered by Storefindy** — the branding badge (removable on the Business plan).',
                ],
            },
        ],
    },

    {
        id: 'customize',
        num: '03',
        icon: 'palette',
        title: 'Customizing the Widget',
        sub: 'Locator → Customize Locator',
        tocLabel: 'Customizing the Widget',
        blocks: [
            {
                type: 'p',
                text: 'The customizer gives you a **live preview** that updates as you edit, with **desktop and mobile** views so you can check both. Changes are scoped to the locator you select.',
            },
            { type: 'h4', icon: 'info', text: 'What you can style' },
            {
                type: 'ul',
                items: [
                    '**Typography** — Font Family (System Default, Arial, Helvetica, Georgia, Times New Roman, Courier New, Roboto, Poppins) and Root Font Size.',
                    '**Search bar** — form style, placeholder text, background, border, text color, and the search icon.',
                    '**Filters & list** — background, border, text, plus active/selected states for chips and the store list.',
                    '**Map markers** — choose a **Standard Pin** or upload a **Custom Image**, set the pin color and size, and optionally show pin numbers on the map.',
                    '**Map behavior** — show a radius indicator and zoom in automatically when a location is selected.',
                    '**Search & results** — distance unit, search radius, maximum results shown, and the default zoom level, all with the preview updating as you change them.',
                    '**Sizing** — preset widths such as Small (500px), Medium (665px), and Large (765px).',
                ],
            },
            {
                type: 'note',
                tone: 'info',
                text: `How much you can customize depends on your plan — **Basic** on Free, **Semi** on Pro, and **Full** customization on Business. **Custom pin images** require Pro or Business (PNG/SVG/JPEG/GIF, max 500${NB}KB, ~32×32px), and the multiple **form styles** are Business-only. Use **Save Changes** to apply — you’ll be warned before leaving with unsaved edits.`,
            },
            { type: 'h4', icon: 'sparkles', text: 'Configure with AI' },
            {
                type: 'p',
                text: 'At the top of the settings tab you can describe the look you want in plain language — for example “make my store locator dark and show opening hours”. Storefindy turns that into a list of proposed changes, shows you exactly which settings would change and from what to what, and applies only the ones you tick. Settings you didn’t mention are never touched, and nothing is saved until you press **Save Changes**. The first request takes a few seconds to get ready; every one after that is quick.',
            },
        ],
    },

    {
        id: 'locations',
        num: '04',
        icon: 'pin-plus',
        title: 'Adding Locations',
        sub: 'Locations → Add Location',
        tocLabel: 'Adding Locations',
        blocks: [
            {
                type: 'p',
                text: 'Locations are the pins on your map. Add them individually here, or import many at once via CSV (see below). Every location belongs to a locator, which you pick as you create it. Manage them all under **Locations → All Locations**.',
            },
            {
                type: 'table',
                head: ['Group', 'Fields'],
                rows: [
                    ['**Basic Information**', 'Store Name _(required)_, Locator, Description.'],
                    ['**Address Details**', 'Street Address, City, State / Province, Postal Code, Country.'],
                    ['**Pin Location on Map**', 'Latitude & Longitude — or search an address to auto-fill the coordinates.'],
                    ['**Business Hours**', 'Location status plus opening hours for each day of the week.'],
                    ['**Holiday / Special Hours**', 'Override hours for specific dates.'],
                    ['**Contact & Links**', 'Phone, Email, Website URL, View Location URL, and social links (Facebook, etc.).'],
                    ['**Location Settings**', 'Published toggle, Show Store Hours, and Custom Notes.'],
                ],
            },
            { type: 'h4', icon: 'sparkles', text: 'Finding locations by describing them' },
            {
                type: 'p',
                text: 'On **Locations → All Locations** you can describe the locations you want to see instead of setting the filters by hand — “show all locations that are not published”, “unpublished stores in Manila”, “locations that have Free Wifi”. Your words are turned into the same filters the form below uses, the filters that were applied are listed above the table, and one click clears them. This is a dashboard convenience only; it is not part of the public store locator, and it never changes or deletes anything.',
            },
            {
                type: 'note',
                tone: 'tip',
                text: 'Don’t know a store’s exact coordinates? Click anywhere on the map to drop a pin, or type the address into the map search — Storefindy fills in the latitude and longitude for you.',
            },
            {
                type: 'note',
                tone: 'info',
                text: '**Required to save:** Store Name, Locator, City, State/Province, and the map coordinates (Latitude & Longitude). Any field you leave blank simply won’t be shown in the widget. You need at least one locator before you can add a location.',
            },
        ],
    },

    {
        id: 'import-csv',
        num: '05',
        icon: 'upload',
        title: 'Importing Locations via CSV',
        sub: 'Locations → Import CSV',
        tocLabel: 'Importing via CSV',
        blocks: [
            {
                type: 'p',
                text: 'Have a lot of stores? Upload them in bulk. The importer is a four-step wizard: **Select locator & mode → Upload → Map Fields → Preview & Import**. Storefindy auto-matches your column headers to the right fields, and you can adjust anything that doesn’t line up. Each CSV imports into exactly one locator.',
            },
            { type: 'h4', icon: 'info', text: 'Import modes' },
            {
                type: 'ul',
                items: [
                    '**Append** — add the new locations alongside existing ones; nothing is deleted.',
                    '**Replace All** — delete every existing location in the locator and replace it with the CSV.',
                    '**Update Existing** — update locations that match by name, and add any new ones.',
                ],
            },
            { type: 'h4', icon: 'check', text: 'Recommended column format' },
            {
                type: 'code',
                lang: 'storefindy_template.csv',
                body: `name,city,state,country,lat,lng,phone,email,website
Walmart Supercenter,New York,NY,US,40.7128,-74.0060,+1-212-000-0000,store@example.com,https://example.com`,
            },
            {
                type: 'ul',
                items: [
                    'Download the pre-formatted template — it has every supported column ready for Excel or Google Sheets.',
                    '**Required columns:** `name`, `city`, `state`, `country`, `lat`, `lng`.',
                    '**Optional columns:** `street`, `postal`, `phone`, `email`, `website`, `location_status`, `filters`, `hours_mon`…`hours_sun`, `holidays`, `view_location_url`, `social_media_links`, `published`, `show_opening_hours`, `custom_notes`. Leave any of them out (or blank) and the location is saved with that field’s default.',
                    `Files must be **.csv** and under **5${NB}MB**.`,
                    'On Map Fields, match each detected column to a Storefindy field (or skip the ones you don’t need).',
                    'The Preview step flags each row as **Ready**, **Warning**, or **Error**. Rows missing a required value or with non-numeric coordinates are skipped; an unrecognized country falls back to the United States.',
                ],
            },
            { type: 'h4', icon: 'sparkles', text: 'Clean up your file with AI' },
            {
                type: 'p',
                text: 'On the Preview step, **Clean with AI** tidies your rows before they are imported. It proposes changes rather than making them: you see every cell it wants to change, the value before and after, and why — then you accept or discard the lot.',
            },
            {
                type: 'ul',
                items: [
                    '**Opening hours in one column** — map a single free-text column such as `Mon-Fri 9-6, Sat 10-4, Closed Sunday` to **Opening hours (free text)** and it is expanded into the seven `hours_mon`…`hours_sun` columns for you. Wordings like `Weekdays 09:00 to 18:00`, `M-F: 9am–6pm` and `Monday through Friday: 9 AM - 6 PM` are all understood.',
                    '**Formatting** — extra spaces removed, ALL-CAPS store names re-cased, phone punctuation tidied, a missing `https://` added to a web address, and placeholder cells such as `N/A` cleared.',
                    '**Matching your own values** — a category written as `Wi-Fi (free)` is matched to the locator’s real `Free Wifi` filter, a status like `temporarily shut` to `temporarily_closed`, and a misspelled country to the right one. It can only ever choose a value that already exists in your locator or in Storefindy’s own lists.',
                    '**Nothing is invented.** A missing phone number stays missing, a blank website stays blank, and a value that has genuinely lost data — a phone number Excel turned into `6.32886E+11`, say — is flagged for you to re-export rather than guessed at.',
                    'Every proposed change is re-checked against the same validation the import itself uses. Anything that would break a cell is dropped before you see it.',
                ],
            },
            { type: 'h4', icon: 'check', text: 'Format of the optional columns' },
            {
                type: 'p',
                text: 'These columns hold more than plain text, so they have a format. A value that doesn’t match is **never** saved as-is: the row still imports, that one field keeps its default, and the Preview step highlights the cell and says why.',
            },
            {
                type: 'ul',
                items: [
                    '`location_status` — `open`, `temporarily_closed`, or `coming_soon`.',
                    '`hours_mon` … `hours_sun` — one column per day: `09:00-21:00` (`9am - 9pm` works too), `closed`, or `24 hours`. Days you leave out keep the default 8–5 schedule.',
                    '`holidays` — `2026-12-24~2026-12-26~09:00-13:00` for a range, `2026-12-25~closed` for one day. Separate several with `|`.',
                    '`filters` — the locator’s own filters, separated by `|`. A filter the locator doesn’t define is dropped, because the widget could never surface it — add it under Edit Locator first.',
                    '`social_media_links` — `facebook=https://facebook.com/yourstore`, several separated by `|`. A link on a well-known domain can skip the `facebook=` part.',
                    '`published`, `show_opening_hours` — `true` or `false` (`yes`/`no` and `1`/`0` are accepted).',
                    '`website`, `view_location_url` — full URLs, including `http://` or `https://`.',
                ],
            },
        ],
    },

    {
        id: 'embed',
        num: '06',
        icon: 'code',
        title: 'Embedding on Your Website',
        sub: 'Locator → Embed Locator',
        tocLabel: 'Embedding on Your Site',
        blocks: [
            {
                type: 'p',
                text: 'Embedding is two lines of code — a custom `<locator-widget>` tag and the Storefindy script. The `locator` attribute is your locator’s ID, which is filled in for you on the Embed page and on your Dashboard’s quick-embed card.',
            },
            {
                type: 'code',
                lang: 'HTML',
                body: `<locator-widget locator="YOUR_LOCATOR_ID"></locator-widget>
<script src="https://www.storefindy.com/widgets.js"></script>`,
            },
            { type: 'h4', icon: 'info', text: 'Where to paste it' },
            {
                type: 'ul',
                items: [
                    '**HTML / any site** — drop both lines where you want the map to appear.',
                    '**WordPress** — add a Custom HTML block and paste the snippet in.',
                    '**Shopify** — add a Custom Liquid / HTML section to the page.',
                    '**React, Vue, Angular** — the Embed page gives you framework-specific snippets for each.',
                ],
            },
            {
                type: 'note',
                tone: 'info',
                text: 'Load the `widgets.js` script once per page, even if you embed more than one locator. Any changes you make in the dashboard appear automatically — no need to re-paste the code.',
            },
        ],
    },

    {
        id: 'subdomains',
        num: '07',
        icon: 'world',
        title: 'Custom Subdomains',
        sub: 'Locator → Custom Subdomains',
        tocLabel: 'Custom Subdomains',
        blocks: [
            {
                type: 'p',
                text: 'No website to embed into? Give your locator its own hosted page at `yourbusinessname.storefindy.com`. Create a subdomain, assign it to a locator, and share the link directly.',
            },
            {
                type: 'table',
                head: ['Group', 'Fields'],
                rows: [
                    ['**Sub Domain Assignment**', 'Sub Domain Name — 3–30 lowercase letters, numbers, or hyphens (e.g. `my-pharmacy`), checked for availability — and the locator it points to.'],
                    ['**SEO Settings**', 'Page Title, Page Description (used as meta title/description for search engines and social sharing), and a favicon upload.'],
                    ['**Header & Footer**', 'Custom Header HTML, Footer HTML, Custom CSS, and Custom JS to fully brand the page.'],
                ],
            },
            {
                type: 'note',
                tone: 'info',
                text: 'The number of subdomains you can create depends on your plan: **1** on Free, **3** on Pro, and **7** on Business.',
            },
        ],
    },

    {
        id: 'analytics',
        num: '08',
        icon: 'chart',
        title: 'Analytics & Insights',
        sub: 'Main → Analytics',
        tocLabel: 'Analytics & Insights',
        blocks: [
            {
                type: 'p',
                text: 'See how visitors use your locator. Filter by a single locator or view all of them together. Analytics includes:',
            },
            {
                type: 'ul',
                items: [
                    '**Views over time** — widget loads across the selected period.',
                    '**Search activity heatmap** — busiest days and hours at a glance.',
                    '**Top searched cities** and **top search queries**.',
                    '**Geographic search clusters** — where demand is concentrated.',
                    '**Searches by hour** of the day.',
                    '**Click-through rate by store** and **most viewed locations**.',
                ],
            },
            {
                type: 'note',
                tone: 'warn',
                text: 'Analytics is not available on the **Free** plan. **Pro** unlocks basic analytics, and the **heatmap, search queries, geographic clusters, and click-through insights** are part of the **Business** plan.',
            },
            {
                type: 'note',
                tone: 'info',
                text: 'Only **embedded widgets and subdomains** record analytics. Anything you do inside the Customize preview is not counted.',
            },
        ],
    },

    {
        id: 'account',
        num: '09',
        icon: 'user',
        title: 'Account & Profile',
        sub: 'Account → Profile',
        tocLabel: 'Account & Profile',
        blocks: [
            {
                type: 'p',
                text: 'Manage your personal and business details under **Account → Profile**: First name, Last name, Display name, Company, Country, and Timezone. Your account email is shown as read-only.',
            },
            {
                type: 'ul',
                items: [
                    '**API Access** — manage API keys for programmatic access (Business plan).',
                    '**Notifications** — control the alerts and emails you receive.',
                    '**Export my data** — download a copy of your account data.',
                    '**Delete my account** — permanently remove your account and its data.',
                ],
            },
            {
                type: 'note',
                tone: 'warn',
                text: 'Deleting your account is permanent — locators, locations, and analytics are removed and can’t be recovered.',
            },
        ],
    },

    {
        id: 'billing',
        num: '10',
        icon: 'card',
        title: 'Plans & Billing',
        sub: 'Account → Billing',
        tocLabel: 'Plans & Billing',
        blocks: [
            {
                type: 'p',
                text: 'Compare plans, upgrade or downgrade, and manage payment details on the Billing page. Here’s what each plan includes:',
            },
            {
                type: 'table',
                head: ['Plan', 'Price', 'Locators', 'Locations', 'Subdomains'],
                rows: [
                    ['**Free**', '$0/mo', '1', '20', '1'],
                    ['**Pro**', '$10/mo', '3', '500', '3'],
                    ['**Business**', '$30/mo', '10', 'Unlimited', '7'],
                ],
            },
            {
                type: 'plans',
                items: [
                    { tone: 'free', icon: 'pin', text: 'Free — CSV import, basic customization, embed' },
                    { tone: 'pro', icon: 'sparkles', text: 'Pro — basic analytics, no branding limits' },
                    { tone: 'biz', icon: 'chart', text: 'Business — heatmap, API, priority support' },
                ],
            },
            {
                type: 'p',
                text: 'The **Business** plan adds advanced analytics & heatmap, API access, the ability to remove Storefindy branding, and priority support. Payments and invoices are handled securely through our billing provider (Lemon Squeezy) — open the billing portal from this page to update your card, change plan, download invoices, or cancel. Use **Sync** if your plan looks out of date after a change.',
            },
            {
                type: 'note',
                tone: 'info',
                text: 'Downgrading never deletes your data. If you exceed a plan’s limits, the oldest items within the limit stay live and the extras become **inactive** (hidden from the public widget) until you upgrade again.',
            },
        ],
    },

    {
        id: 'support',
        num: '11',
        icon: 'lifebuoy',
        title: 'Support',
        sub: 'Support → Help & Report Bug',
        tocLabel: 'Support',
        blocks: [
            {
                type: 'ul',
                items: [
                    '**Help and Support** — browse guides and reach the team when you’re stuck.',
                    '**Report Bug** — found something broken? Report it with a severity level and Storefindy attaches your system info to help us debug faster.',
                ],
            },
            {
                type: 'note',
                tone: 'tip',
                text: 'Include the locator name and the page URL where you saw the issue — it helps us reproduce and fix things much faster.',
            },
        ],
    },

    {
        id: 'faq',
        num: '12',
        icon: 'help',
        title: 'Frequently Asked Questions',
        sub: 'Quick answers to common questions',
        tocLabel: 'FAQ',
        blocks: [
            {
                type: 'faq',
                items: [
                    {
                        q: 'What’s the difference between a locator and a location?',
                        a: 'A **locator** is the map widget you embed. **Locations** are the individual stores or points that appear inside it. One locator can hold many locations.',
                    },
                    {
                        q: 'Do I need to know how to code to embed my locator?',
                        a: 'No. Copy the two-line snippet from the Embed page and paste it into your site builder’s HTML block. We provide ready-made snippets for WordPress, Shopify, React, Vue, and Angular too.',
                    },
                    {
                        q: 'Will my changes update automatically after embedding?',
                        a: 'Yes. The widget always reflects your latest dashboard settings, so edits to design or locations appear live — no need to re-paste the code.',
                    },
                    {
                        q: 'Can I import my existing store list?',
                        a: `Yes. Use **Import CSV**, download the template, fill it in, and map your columns. Files must be .csv and under 5${NB}MB.`,
                    },
                    {
                        q: 'How do I remove the “Powered by Storefindy” badge?',
                        a: 'Branding removal is included on the **Business** plan. Upgrade from the Billing page to hide the badge.',
                    },
                    {
                        q: 'What happens if I hit my plan limits?',
                        a: 'You’ll be prompted to upgrade when you reach your locator, location, or subdomain caps. Existing data stays intact — you just can’t add more until you upgrade.',
                    },
                    {
                        q: 'Do the AI features cost anything extra?',
                        a: 'No. The AI features are included on every plan with no per-use charge. The first time you use one it takes a few seconds to get ready, and it is quick from then on. If AI is unavailable, the panels simply don’t appear and every feature stays fully usable by hand.',
                    },
                ],
            },
        ],
    },
];

/* --------------------------------------------------------------------- *
 * Plain text, for search
 * ------------------------------------------------------------------ */

/**
 * The one pattern that reads the inline markup, shared with the renderer.
 *
 * It has to be a single alternation rather than three passes, and it has to be
 * used the same way in both places. Applied in sequence, the backtick rule
 * strips the delimiters from `location_status` and the emphasis rule then eats
 * its underscores — which is exactly the bug this replaced: the page rendered
 * "location_status" correctly while the search corpus held "locationstatus".
 * Matching left to right in one pass, a code span is always consumed whole.
 */
export const INLINE_MARKUP = /\*\*(.+?)\*\*|`(.+?)`|_(.+?)_/g;

/** Strip the inline markup, leaving the words a search should match on. */
export function stripMarkup(text) {
    return String(text ?? '')
        // `lastIndex` is reset by using a fresh regex per call: INLINE_MARKUP is
        // a shared global-flagged object, and String.replace resets it anyway,
        // but this keeps that from being load-bearing.
        .replace(new RegExp(INLINE_MARKUP.source, 'g'), (full, bold, code, em) => bold ?? code ?? em)
        .replace(/\s+/g, ' ')
        .trim();
}

/** One block as a plain sentence or two. */
function blockToText(block) {
    switch (block.type) {
        case 'p':
        case 'h4':
            return stripMarkup(block.text);
        case 'note':
            return stripMarkup(block.text);
        case 'ul':
            return block.items.map(stripMarkup).join(' ');
        case 'steps':
            return block.items.map((item) => `${stripMarkup(item.title)}: ${stripMarkup(item.desc)}`).join(' ');
        case 'plans':
            return block.items.map((item) => stripMarkup(item.text)).join(' ');
        case 'table':
            return [
                block.head.map(stripMarkup).join(', '),
                ...block.rows.map((row) => row.map(stripMarkup).filter(Boolean).join(' — ')),
            ].join('. ');
        case 'code':
            return `${block.lang}: ${block.body}`;
        case 'faq':
            return block.items.map((item) => `${stripMarkup(item.q)} ${stripMarkup(item.a)}`).join(' ');
        default:
            return '';
    }
}

/** Everything one section says, as plain text. */
export function sectionToText(section) {
    return [section.title, section.sub, ...section.blocks.map(blockToText)].filter(Boolean).join('. ');
}

export { blockToText };
