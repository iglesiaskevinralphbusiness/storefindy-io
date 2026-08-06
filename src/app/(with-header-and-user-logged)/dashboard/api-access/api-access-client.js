'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import styles from '../Dashboard.module.scss';
import Modal from '@/components/Modal';
import { postGenerateApiAuthKey } from '@/actions/profile';
import {
    TbApi,
    TbBook,
    TbKey,
    TbEye,
    TbEyeOff,
    TbCopy,
    TbShieldCheck,
    TbCircleCheck,
    TbCalendar,
    TbInfoCircle,
    TbInfinity,
    TbRefresh,
    TbAlertTriangle,
    TbCode,
    TbSitemap,
    TbCircleX,
} from 'react-icons/tb';

const MASKED_KEY = 'sf_live_••••••••••••••••••••••••••••••••';

// `api_auth_key.created_at` is stored as an ISO string — render it as e.g. "Jun 1, 2026".
function formatCreated(created_at) {
    if (!created_at) return '—';
    const date = new Date(created_at);
    if (Number.isNaN(date.getTime())) return created_at;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Host the samples point at. NEXT_PUBLIC_ROOT_URL is inlined at build time, so
// the examples match wherever the app is running (localhost in dev, the real
// domain in production). Trailing slashes are trimmed to avoid `//api/v1`.
const ROOT_URL = (process.env.NEXT_PUBLIC_ROOT_URL || 'https://www.storefindy.com').replace(/\/+$/, '');
const API_BASE = `${ROOT_URL}/api/v1`;
const SAMPLE_KEY = 'sf_live_your_key_here';

// IDs used in the samples, so the cURL for a /:id route is copy-paste shaped.
const SAMPLE_LOCATOR_ID = '685fd0b41c9a2f8e5d7b3c22';
const SAMPLE_LOCATION_ID = '6864f1c2a7b3e10d9c4f2a11';

// Every cURL sample uses the account's real key once one has been generated, so
// the commands are runnable as shown. Falls back to the placeholder otherwise.
const buildUsageCurl = (apiKey = SAMPLE_KEY) => `# Example — get your locations, 10 per page
curl -X GET "${API_BASE}/locations?page=1&rows=10" \\
  -H "Authorization: Bearer ${apiKey}"`;

/**
 * Build a runnable cURL for one endpoint. `curlQuery` appends a query string,
 * `curlBody` supplies a minimal valid JSON body — Content-Type is only sent
 * when there is one.
 */
function buildCurl({ method, path, curlQuery = '', curlBody }, apiKey = SAMPLE_KEY) {
    const id = path.startsWith('/locators') ? SAMPLE_LOCATOR_ID : SAMPLE_LOCATION_ID;
    const url = `${API_BASE}${path.replace(':id', id)}${curlQuery}`;

    const lines = [
        `curl -X ${method} "${url}" \\`,
        `  -H "Authorization: Bearer ${apiKey}"`,
    ];

    if (curlBody) {
        lines[lines.length - 1] += ' \\';
        lines.push('  -H "Content-Type: application/json" \\');
        lines.push(`  -d '${curlBody}'`);
    }

    return lines.join('\n');
}

// Error shapes are identical across every endpoint, so they are documented once
// here rather than repeated in each sample response.
const ERROR_EXAMPLE = `// 401 — missing, malformed or unknown key
{ "success": false, "error": "Invalid API key." }

// 400 — one or more fields failed validation
{
  "status": "error",
  "errors": {
    "name": "Store name is required",
    "latitude": "Latitude must be between -90 and 90"
  }
}

// 404 — the record does not exist, or belongs to another account
{ "success": false, "error": "Location not found." }

// 500 — unexpected server error
{ "status": "fatal", "message": "Server error. Please try again." }`;

// Each endpoint mirrors the server action it wraps — see the `action` note for
// the source in src/actions/. Field names in requests match the model, so what
// you send is what you get back.
const ENDPOINT_GROUPS = [
    {
        label: 'Locators',
        endpoints: [
            {
                id: 'get-locators',
                method: 'GET',
                tone: 'get',
                path: '/locators',
                desc: 'Returns every locator in your account, each with its total location count and plan-based status. Responds with a plain array — there is no wrapper object. Map defaults, search settings, filters, widget display settings and the per-day analytics rows are all omitted from locator responses.',
                response: `[
  {
    "_id": "685fd0b41c9a2f8e5d7b3c22",
    "user_id": "6858b9e0f13c4a7d2e9f1b05",
    "name": "Main Store Locator",
    "description": "All our retail branches",
    "default_language": "en",
    "views_count": 1280,
    "createdAt": "2026-06-01T08:00:00.000Z",
    "updatedAt": "2026-07-01T12:00:00.000Z",
    "total_locations": 52,
    "status": "active"
  }
]`,
            },
            {
                id: 'get-locator',
                method: 'GET',
                tone: 'get',
                path: '/locators/:id',
                desc: 'Returns a single locator by ID, plus the owning account plan. Responds 404 when the ID is malformed or the locator belongs to another account. Map defaults, search settings, filters, widget display settings, the per-day analytics rows and user_id are all omitted here.',
                params: [
                    { name: 'id', in: 'path', type: 'string', required: true, desc: 'The locator ID e.g. 685fd0b41c9a2f8e5d7b3c22' },
                ],
                response: `{
  "_id": "685fd0b41c9a2f8e5d7b3c22",
  "name": "Main Store Locator",
  "description": "All our retail branches",
  "default_language": "en",
  "views_count": 1280,
  "createdAt": "2026-06-01T08:00:00.000Z",
  "updatedAt": "2026-07-01T12:00:00.000Z",
  "user_plan": "pro",
  "status": "active"
}`,
            },
            {
                id: 'post-locator',
                method: 'POST',
                tone: 'post',
                path: '/locators',
                desc: 'Creates a new locator. Only name is required — every other field falls back to the default shown below. The show_* and powered_by_storefindy flags are accepted but write-only: they are not echoed back in any locator response. Locators beyond your plan limit are still created, but report status "inactive".',
                payload: `{
  "name": "My New Locator",         // required
  "description": "",                // optional
  "default_language": "en",         // optional — default "en"

  // Everything below is write-only: accepted here, never echoed back.
  "default_country": "us",          // optional — ISO code, default "us"
  "default_zoom_level": 10,         // optional — default 10
  "search_radius": 10,              // optional — miles, default 10
  "maximum_results_shown": 10,      // optional — default 10
  "filters": [],                    // optional — array of filter labels
  "show_search_bar": true,          // optional — default true
  "detect_location": true,          // optional — default true
  "show_filters": false,            // optional — default false
  "show_radius": false,             // optional — default false
  "show_store_list": true,          // optional — default true
  "show_directions": true,          // optional — default true
  "show_store_hours": false,        // optional — default false
  "powered_by_storefindy": true     // optional — default true
}`,
                curlBody: `{
    "name": "My New Locator",
    "default_country": "ph",
    "search_radius": 25
  }`,
                response: `{
  "status": "success",
  "message": "Locator created successfully",
  "data": {
    "_id": "686a1f33c2d4b90e7a1c5e44",
    "user_id": "6858b9e0f13c4a7d2e9f1b05",
    "name": "My New Locator",
    "description": "",
    "default_language": "en",
    "createdAt": "2026-07-01T10:00:00.000Z",
    "updatedAt": "2026-07-01T10:00:00.000Z"
  }
}`,
            },
            {
                id: 'put-locator',
                method: 'PUT',
                tone: 'put',
                path: '/locators/:id',
                desc: 'Updates an existing locator. This is a partial update — only include the fields you want to change, and everything you omit keeps its current value.',
                params: [
                    { name: 'id', in: 'path', type: 'string', required: true, desc: 'The locator ID to update' },
                ],
                payload: `{
  "name": "Updated Name",           // optional — cannot be empty if sent
  "description": "Updated copy",    // optional
  "search_radius": 25,              // optional — write-only, not echoed back
  "show_filters": true,             // optional — write-only, not echoed back
  "filters": ["Pharmacy"]           // optional — write-only, not echoed back
}`,
                curlBody: `{
    "name": "Updated Name",
    "search_radius": 25
  }`,
                response: `{
  "status": "success",
  "message": "Locator updated successfully",
  "data": {
    "_id": "685fd0b41c9a2f8e5d7b3c22",
    "name": "Updated Name",
    "description": "Updated copy",
    "default_language": "en",
    "updatedAt": "2026-07-01T11:00:00.000Z"
  }
}`,
            },
            {
                id: 'del-locator',
                method: 'DELETE',
                tone: 'del',
                label: 'DEL',
                path: '/locators/:id',
                desc: 'Permanently deletes a locator, along with every location and sub-domain attached to it. This cannot be undone.',
                params: [
                    { name: 'id', in: 'path', type: 'string', required: true, desc: 'The locator ID to delete' },
                ],
                response: `{
  "status": "success",
  "message": "Locator deleted successfully"
}`,
            },
        ],
    },
    {
        label: 'Locations',
        endpoints: [
            {
                id: 'get-locations',
                method: 'GET',
                tone: 'get',
                path: '/locations',
                desc: 'Returns a paginated list of your locations, each with its parent locator name, a concatenated address, and its plan-based status.',
                params: [
                    { name: 'page', in: 'query', type: 'number', required: false, desc: 'Page number for pagination. Default 1' },
                    { name: 'rows', in: 'query', type: 'number', required: false, desc: 'Results per page. Default 10' },
                    { name: 'sort', in: 'query', type: 'string', required: false, desc: 'Field to sort by e.g. createdAt, updatedAt, name. Default createdAt' },
                    { name: 'order', in: 'query', type: 'string', required: false, desc: 'asc or desc. Default asc' },
                    { name: 'search', in: 'query', type: 'string', required: false, desc: 'Free text matched against name, street, city, state, country and postal' },
                    { name: 'locators', in: 'query', type: 'string', required: false, desc: 'Comma-separated locator IDs to filter by e.g. ?locators=685f...,686a...' },
                ],
                curlQuery: '?page=1&rows=10&sort=createdAt&order=desc',
                response: `{
  "rows": 10,
  "page": 1,
  "pages": 6,
  "items": [
    {
      "_id": "6864f1c2a7b3e10d9c4f2a11",
      "locator_id": "685fd0b41c9a2f8e5d7b3c22",
      "name": "SM Mall of Asia",
      "published": true,
      "views": [
        {
          "date_id": "2026-07-01",
          "view_count": 128,
          "click_count": 14
        }
      ],
      "createdAt": "2026-06-01T08:00:00.000Z",
      "updatedAt": "2026-07-01T12:00:00.000Z",
      "locator": "Main Store Locator",
      "address": "Seaside Blvd, Pasay City, Metro Manila, Philippines, 1300",
      "status": "active"
    }
  ],
  "used": "52 of 500 used"
}`,
            },
            {
                id: 'get-location',
                method: 'GET',
                tone: 'get',
                path: '/locations/:id',
                desc: 'Returns the complete location document by ID — every stored field, including business hours, holidays, social links and per-day view counts. Nothing is hidden here, unlike the locator endpoints. Responds 404 when the ID is malformed or the location belongs to another account.',
                params: [
                    { name: 'id', in: 'path', type: 'string', required: true, desc: 'The location ID e.g. 6864f1c2a7b3e10d9c4f2a11' },
                ],
                response: `{
  "_id": "6864f1c2a7b3e10d9c4f2a11",
  "user_id": "6858b9e0f13c4a7d2e9f1b05",
  "locator_id": "685fd0b41c9a2f8e5d7b3c22",
  "name": "SM Mall of Asia",
  "description": "Ground floor, North Wing",
  "filters": ["Pharmacy"],
  "street": "Seaside Blvd",
  "city": "Pasay City",
  "state": "Metro Manila",
  "postal": "1300",
  "country": "ph",
  "latitude": 14.5353,
  "longitude": 120.9822,
  "location_status": "open",
  "hours": {
    "Mon": { "enabled": true, "open": "08:00", "close": "17:00" },
    "Tue": { "enabled": true, "open": "08:00", "close": "17:00" },
    "Wed": { "enabled": true, "open": "08:00", "close": "17:00" },
    "Thu": { "enabled": true, "open": "08:00", "close": "17:00" },
    "Fri": { "enabled": true, "open": "08:00", "close": "17:00" },
    "Sat": { "enabled": true, "open": "09:00", "close": "15:00" },
    "Sun": { "enabled": false, "open": "08:00", "close": "17:00" }
  },
  "holidays": [
    { "from": "2026-12-24", "to": "2026-12-25", "enabled": false, "open": "", "close": "" }
  ],
  "phone": "+63 2 8556 0100",
  "email": "moa@sm.com",
  "website": "https://sm.ph",
  "view_location_url": "",
  "social_media_links": [
    { "code": "facebook", "link": "https://facebook.com/smmoa" }
  ],
  "published": true,
  "show_opening_hours": true,
  "custom_notes": "",
  "views": [
    {
      "date_id": "2026-07-24",
      "view_count": 128,
      "click_count": 14,
      "createdAt": "2026-07-24T03:31:01.914Z",
      "updatedAt": "2026-07-24T03:31:01.914Z"
    }
  ],
  "createdAt": "2026-06-01T08:00:00.000Z",
  "updatedAt": "2026-07-01T12:00:00.000Z",
  "__v": 0
}`,
            },
            {
                id: 'post-location',
                method: 'POST',
                tone: 'post',
                path: '/locations',
                desc: 'Creates a location inside one of your locators. All seven days must be present in hours. Locations beyond your plan limit are still created, but report status "inactive".',
                payload: `{
  "name": "SM Mall of Asia",        // required
  "locator_id": "685fd0b4...",      // required — must be a locator you own
  "city": "Pasay City",             // required
  "state": "Metro Manila",          // required
  "country": "ph",                  // required — ISO code
  "location_status": "open",        // required — open|temporarily_closed|coming_soon
  "latitude": 14.5353,              // required — between -90 and 90
  "longitude": 120.9822,            // required — between -180 and 180
  "hours": {                        // required — all 7 days
    "Mon": { "enabled": true, "open": "08:00", "close": "17:00" },
    "Tue": { "enabled": true, "open": "08:00", "close": "17:00" },
    "Wed": { "enabled": true, "open": "08:00", "close": "17:00" },
    "Thu": { "enabled": true, "open": "08:00", "close": "17:00" },
    "Fri": { "enabled": true, "open": "08:00", "close": "17:00" },
    "Sat": { "enabled": true, "open": "09:00", "close": "15:00" },
    "Sun": { "enabled": false, "open": "08:00", "close": "17:00" }
  },
  "street": "Seaside Blvd",         // optional
  "postal": "1300",                 // optional
  "description": "",                // optional
  "filters": ["Pharmacy"],          // optional — must exist on the locator
  "phone": "+63 2 8556 0100",       // optional
  "email": "moa@sm.com",            // optional — must be a valid email
  "website": "https://sm.ph",       // optional — must include http:// or https://
  "view_location_url": "",          // optional — must include http:// or https://
  "social_media_links": [           // optional — items missing code or link are dropped
    { "code": "facebook", "link": "https://facebook.com/smmoa" }
  ],
  "holidays": [],                   // optional
  "published": true,                // optional — default true
  "show_opening_hours": false,      // optional — default false
  "custom_notes": ""                // optional
}`,
                curlBody: `{
    "name": "SM Mall of Asia",
    "locator_id": "${SAMPLE_LOCATOR_ID}",
    "city": "Pasay City",
    "state": "Metro Manila",
    "country": "ph",
    "location_status": "open",
    "latitude": 14.5353,
    "longitude": 120.9822,
    "hours": {
      "Mon": { "enabled": true, "open": "08:00", "close": "17:00" },
      "Tue": { "enabled": true, "open": "08:00", "close": "17:00" },
      "Wed": { "enabled": true, "open": "08:00", "close": "17:00" },
      "Thu": { "enabled": true, "open": "08:00", "close": "17:00" },
      "Fri": { "enabled": true, "open": "08:00", "close": "17:00" },
      "Sat": { "enabled": true, "open": "09:00", "close": "15:00" },
      "Sun": { "enabled": false, "open": "08:00", "close": "17:00" }
    }
  }`,
                response: `{
  "status": "success",
  "message": "Location added successfully",
  "data": {
    "_id": "6864f1c2a7b3e10d9c4f2a11",
    "user_id": "6858b9e0f13c4a7d2e9f1b05",
    "locator_id": "685fd0b41c9a2f8e5d7b3c22",
    "name": "SM Mall of Asia",
    "city": "Pasay City",
    "state": "Metro Manila",
    "country": "ph",
    "latitude": 14.5353,
    "longitude": 120.9822,
    "location_status": "open",
    "published": true,
    "createdAt": "2026-07-01T10:00:00.000Z",
    "updatedAt": "2026-07-01T10:00:00.000Z"
  }
}`,
            },
            {
                id: 'put-location',
                method: 'PUT',
                tone: 'put',
                path: '/locations/:id',
                desc: 'Updates an existing location. This is a partial update — only include the fields you want to change. If you send hours, all seven days are required.',
                params: [
                    { name: 'id', in: 'path', type: 'string', required: true, desc: 'The location ID to update' },
                ],
                payload: `{
  "name": "SM MOA Updated",         // optional
  "phone": "+63 2 9999 0000",       // optional
  "latitude": 14.5360,              // optional
  "longitude": 120.9830,            // optional
  "published": false,               // optional
  "locator_id": "686a1f33..."       // optional — moving is allowed within your account
}`,
                curlBody: `{
    "name": "SM MOA Updated",
    "phone": "+63 2 9999 0000",
    "published": false
  }`,
                response: `{
  "status": "success",
  "message": "Location updated successfully",
  "data": {
    "_id": "6864f1c2a7b3e10d9c4f2a11",
    "name": "SM MOA Updated",
    "phone": "+63 2 9999 0000",
    "latitude": 14.536,
    "longitude": 120.983,
    "published": false,
    "updatedAt": "2026-07-01T12:00:00.000Z"
  }
}`,
            },
            {
                id: 'del-location',
                method: 'DELETE',
                tone: 'del',
                label: 'DEL',
                path: '/locations/:id',
                desc: 'Permanently deletes a location from its locator. This cannot be undone.',
                params: [
                    { name: 'id', in: 'path', type: 'string', required: true, desc: 'The location ID to delete' },
                ],
                response: `{
  "status": "success",
  "message": "Location deleted successfully"
}`,
            },
        ],
    },
];

const ALL_ENDPOINTS = ENDPOINT_GROUPS.flatMap((group) => group.endpoints);

// Comments, strings / property keys, numbers, literals and HTTP verbs — enough
// to colour the JSON and cURL samples without pulling in a syntax highlighter.
const TOKEN_PATTERN = /(#[^\n]*|\/\/[^\n]*)|("(?:[^"\\]|\\.)*")(\s*:)?|(-?\b\d+(?:\.\d+)?\b)|\b(true|false|null)\b|\b(GET|POST|PUT|PATCH|DELETE)\b/g;

function highlight(code) {
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = TOKEN_PATTERN.exec(code)) !== null) {
        const [token, comment, quoted, colon, number, literal, verb] = match;

        if (match.index > lastIndex) {
            parts.push(code.slice(lastIndex, match.index));
        }

        const key = `t-${match.index}`;
        if (comment) {
            parts.push(<span key={key} className={styles.cComment}>{comment}</span>);
        } else if (quoted) {
            parts.push(
                <span key={key} className={colon ? styles.cProp : styles.cStr}>{quoted}</span>
            );
            if (colon) parts.push(colon);
        } else if (number) {
            parts.push(<span key={key} className={styles.cNum}>{number}</span>);
        } else if (literal || verb) {
            parts.push(<span key={key} className={styles.cVal}>{literal || verb}</span>);
        }

        lastIndex = match.index + token.length;
    }

    if (lastIndex < code.length) parts.push(code.slice(lastIndex));
    return parts;
}

function CodeBlock({ lang, code }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(code).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
                <div className={styles.codeLang}>
                    <span className={styles.codeDots}>
                        <span />
                        <span />
                        <span />
                    </span>
                    {lang}
                </div>
                <button
                    type="button"
                    className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                    onClick={copy}
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <pre>{highlight(code)}</pre>
        </div>
    );
}

export default function ApiAccessClient({ api_auth_key={ value: '', created_at: '' } }) {
    const router = useRouter();
    const [keyVisible, setKeyVisible] = useState(false);
    const [activeEndpointId, setActiveEndpointId] = useState(ALL_ENDPOINTS[0].id);
    const [regenOpen, setRegenOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    // Holds the freshly issued key so the card updates immediately, before the
    // server-rendered `api_auth_key` prop comes back from router.refresh().
    const [newKey, setNewKey] = useState(null);

    const endpoint = ALL_ENDPOINTS.find((ep) => ep.id === activeEndpointId);

    const key = newKey || api_auth_key || { value: '', created_at: '' };
    const hasKey = Boolean(key.value);

    // The samples follow the show/hide toggle: the real key while it is revealed
    // (so the commands run as shown), the placeholder while it is masked.
    const curlKey = hasKey && keyVisible ? key.value : SAMPLE_KEY;

    const copyKey = () => {
        if (!hasKey) return;
        navigator.clipboard.writeText(key.value).catch(() => {});
        toast.success('API key copied to clipboard');
    };

    // Issues a key on first use, or rotates the existing one. Both go through the
    // same server action — the only difference is the confirmation step, which
    // first-time creation skips because there is no old key to invalidate.
    const handleGenerateKey = async () => {
        if (generating) return;

        setGenerating(true);
        setRegenOpen(false);

        try {
            const result = await postGenerateApiAuthKey();

            if (result?.status === 'success') {
                setNewKey(result.api_auth_key);
                setKeyVisible(true); // reveal it once — they need to copy it now
                toast.success(
                    hasKey
                        ? 'New API key generated — copy it now and update your integrations'
                        : 'API key generated — copy it and start making requests'
                );
                router.refresh();
            } else {
                toast.error(result?.message || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            {/* INFO BANNER */}
            <div className={styles.apiBanner}>
                <div className={styles.abIcon}><TbApi /></div>
                <div className={styles.abInfo}>
                    <div className={styles.abTitle}>Storefindy REST API</div>
                    <div className={styles.abDesc}>
                        Use your Bearer API key to manage locators and locations
                        programmatically. One key per account — no expiration.
                    </div>
                </div>
                <Link href="/dashboard/documentation" className={styles.abLink}>
                    <TbBook /> View docs
                </Link>
            </div>

            {/* API KEY */}
            <div className={styles.apiCard}>
                <div className={styles.apiCardHeader}>
                    <div className={styles.apiCardTitle}><TbKey /> Your API Key</div>
                    <div className={`${styles.statusPill} ${hasKey ? '' : styles.none}`}>
                        <span className={styles.statusDot} /> {hasKey ? 'Active' : 'Not generated'}
                    </div>
                </div>

                <div className={styles.keyBox}>
                    <div className={styles.keyLabel}>
                        Bearer Token
                        {hasKey && <span className={styles.keySecure}><TbShieldCheck /> Secure</span>}
                    </div>
                    <div className={styles.keyValueRow}>
                        <div className={`${styles.keyValue} ${hasKey && !keyVisible ? styles.masked : ''}`}>
                            {!hasKey ? 'No key yet' : keyVisible ? key.value : MASKED_KEY}
                        </div>
                        {hasKey && (
                            <div className={styles.keyActions}>
                                <button
                                    type="button"
                                    className={styles.keyBtn}
                                    onClick={() => setKeyVisible((visible) => !visible)}
                                    title={keyVisible ? 'Hide key' : 'Show key'}
                                    aria-label={keyVisible ? 'Hide key' : 'Show key'}
                                >
                                    {keyVisible ? <TbEyeOff /> : <TbEye />}
                                </button>
                                <button
                                    type="button"
                                    className={styles.keyBtn}
                                    onClick={copyKey}
                                    title="Copy key"
                                    aria-label="Copy key"
                                >
                                    <TbCopy />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className={styles.keyMeta}>
                        {hasKey ? (
                            <>
                                <div className={`${styles.keyMetaItem} ${styles.ok}`}><TbCircleCheck /> Active</div>
                                <div className={styles.keyMetaItem}><TbCalendar /> Created {formatCreated(key.created_at)}</div>
                                <div className={styles.keyMetaItem}><TbInfinity /> Never expires</div>
                            </>
                        ) : (
                            <div className={styles.keyMetaItem}>
                                <TbInfoCircle /> Generate a key to start making API requests
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.generateRow}>
                    <div className={styles.genInfo}>
                        <strong className={styles.genTitle}>
                            {hasKey ? 'Regenerate your key' : 'Generate your key'}
                        </strong>
                        {hasKey
                            ? 'Use this if your key is compromised. Your old key stops working immediately.'
                            : 'Create a Bearer token to authenticate your requests to the Storefindy REST API.'}
                    </div>
                    <button
                        type="button"
                        className={styles.btnGen}
                        onClick={() => (hasKey ? setRegenOpen(true) : handleGenerateKey())}
                        disabled={generating}
                    >
                        <TbRefresh />
                        {generating
                            ? 'Generating…'
                            : hasKey ? 'Regenerate Key' : 'Generate Key'}
                    </button>
                </div>

                {hasKey && (
                    <div className={styles.warnBox}>
                        <TbAlertTriangle />
                        <p>
                            Never expose your API key in client-side JavaScript, public repos, or frontend
                            code. If compromised, regenerate it immediately.
                        </p>
                    </div>
                )}
            </div>

            {/* USAGE EXAMPLE */}
            <div className={styles.apiCard}>
                <div className={styles.apiCardHeader}>
                    <div className={styles.apiCardTitle}><TbCode /> How to use your API key</div>
                </div>
                <div className={styles.usageIntro}>
                    Pass your key as a <span className={styles.ic}>Bearer</span> token in the{' '}
                    <span className={styles.ic}>Authorization</span> header of every request.
                    Send <span className={styles.ic}>POST</span> and <span className={styles.ic}>PUT</span>{' '}
                    bodies as JSON. Every endpoint is scoped to your own account — records
                    belonging to anyone else respond <span className={styles.ic}>404</span>.
                    {hasKey && !keyVisible && (
                        <> Reveal your key above to drop it straight into these examples.</>
                    )}
                </div>
                <CodeBlock lang="cURL" code={buildUsageCurl(curlKey)} />

                <div className={styles.epSectionLabel}>Error responses</div>
                <CodeBlock lang="JSON" code={ERROR_EXAMPLE} />
            </div>

            {/* ENDPOINTS EXPLORER */}
            <div className={styles.apiCard}>
                <div className={styles.apiCardHeader}>
                    <div className={styles.apiCardTitle}><TbSitemap /> API Endpoints</div>
                    <div className={styles.apiCardNote}>Click an endpoint to see payload and response</div>
                </div>
                <div className={styles.epLayout}>
                    <div className={styles.epNav}>
                        {ENDPOINT_GROUPS.map((group) => (
                            <div key={group.label}>
                                <div className={styles.epGroupLabel}>{group.label}</div>
                                {group.endpoints.map((ep) => (
                                    <button
                                        key={ep.id}
                                        type="button"
                                        className={`${styles.epNavItem} ${ep.id === activeEndpointId ? styles.active : ''}`}
                                        onClick={() => setActiveEndpointId(ep.id)}
                                    >
                                        <span className={`${styles.epMethod} ${styles[ep.tone]}`}>
                                            {ep.label || ep.method}
                                        </span>
                                        <span className={styles.epPath}>{ep.path}</span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div className={styles.epDetail}>
                        <div className={styles.epDetailHeader}>
                            <span className={`${styles.epDetailMethod} ${styles[endpoint.tone]}`}>
                                {endpoint.method}
                            </span>
                            <span className={styles.epDetailPath}>/api/v1{endpoint.path}</span>
                        </div>
                        <div className={styles.epDetailDesc}>{endpoint.desc}</div>

                        {endpoint.params && (
                            <>
                                <div className={styles.epSectionLabel}>Parameters</div>
                                <div className={styles.paramTableWrap}>
                                    <table className={styles.paramTable}>
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>In</th>
                                                <th>Type</th>
                                                <th>Required</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {endpoint.params.map((param) => (
                                                <tr key={param.name}>
                                                    <td><span className={styles.ic}>{param.name}</span></td>
                                                    <td className={styles.epParamIn}>{param.in}</td>
                                                    <td><span className={styles.pType}>{param.type}</span></td>
                                                    <td>
                                                        <span className={param.required ? styles.pReq : styles.pOpt}>
                                                            {param.required ? 'required' : 'optional'}
                                                        </span>
                                                    </td>
                                                    <td>{param.desc}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {endpoint.payload && (
                            <>
                                <div className={styles.epSectionLabel}>Request Body</div>
                                <CodeBlock lang="JSON" code={endpoint.payload} />
                            </>
                        )}

                        <div className={styles.epSectionLabel}>Sample Response</div>
                        <CodeBlock lang="JSON" code={endpoint.response} />

                        <div className={styles.epSectionLabel}>cURL</div>
                        <CodeBlock lang="cURL" code={buildCurl(endpoint, curlKey)} />
                    </div>
                </div>
            </div>

            <Modal
                isOpen={regenOpen}
                onClose={() => setRegenOpen(false)}
                title="Regenerate API key"
                footer={
                    <>
                        <button
                            type="button"
                            className={styles.apiRegenBtnCancel}
                            onClick={() => setRegenOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.apiRegenBtnConfirm}
                            onClick={handleGenerateKey}
                            disabled={generating}
                        >
                            <TbRefresh /> {generating ? 'Regenerating…' : 'Regenerate Key'}
                        </button>
                    </>
                }
            >
                <div className={styles.apiRegenModal}>
                    <div className={styles.regenWarn}>
                        <TbAlertTriangle />
                        <div>
                            <div className={styles.regenWarnTitle}>This takes effect immediately</div>
                            <div className={styles.regenWarnDesc}>
                                Your current key stops working the moment the new one is created.
                            </div>
                        </div>
                    </div>
                    <div className={styles.regenList}>
                        <div className={styles.regenListItem}>
                            <TbCircleX /> Every request using the old key will fail with 401 Unauthorized.
                        </div>
                        <div className={styles.regenListItem}>
                            <TbCircleX /> You need to update all integrations with the new key.
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}
