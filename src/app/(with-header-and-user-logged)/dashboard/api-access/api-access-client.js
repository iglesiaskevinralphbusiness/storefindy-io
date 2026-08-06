'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import styles from '../Dashboard.module.scss';
import Modal from '@/components/Modal';
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
    TbClock,
    TbInfinity,
    TbRefresh,
    TbAlertTriangle,
    TbCode,
    TbSitemap,
    TbCircleX,
} from 'react-icons/tb';

// Placeholder key details — swap for the real values once the API key
// endpoints exist server-side (see regenerate() below).
const API_KEY = {
    value: 'sf_live_k8x2mNpQ4rVwYhLzJ9aTbUcDeFgHiOsE',
    created: 'Jun 1, 2026',
    lastUsed: '2 hours ago',
};
const MASKED_KEY = 'sf_live_••••••••••••••••••••••••••••••••';

const CURL_EXAMPLE = `# Example — get your locations, 10 per page
curl -X GET "https://storefindy.com/api/v1/locations?page=1&rows=10" \\
  -H "Authorization: Bearer sf_live_your_key_here" \\
  -H "Content-Type: application/json"`;

const ENDPOINT_GROUPS = [
    {
        label: 'Locators',
        endpoints: [
            {
                id: 'get-locators',
                method: 'GET',
                tone: 'get',
                path: '/locators',
                desc: 'Returns a list of all locators in your account.',
                response: `{
  "success": true,
  "data": [
    {
      "id": "loc_abc123",
      "name": "Main Store Locator",
      "status": "active",
      "location_count": 52,
      "created_at": "2026-06-01T08:00:00Z"
    }
  ],
  "total": 3
}`,
            },
            {
                id: 'get-locator',
                method: 'GET',
                tone: 'get',
                path: '/locators/:id',
                desc: 'Returns a single locator by ID.',
                params: [
                    { name: 'id', in: 'path', type: 'string', required: true, desc: 'The locator ID e.g. loc_abc123' },
                ],
                response: `{
  "success": true,
  "data": {
    "id": "loc_abc123",
    "name": "Main Store Locator",
    "status": "active",
    "map_style": "standard",
    "primary_color": "#171717",
    "location_count": 52,
    "created_at": "2026-06-01T08:00:00Z"
  }
}`,
            },
            {
                id: 'post-locator',
                method: 'POST',
                tone: 'post',
                path: '/locators',
                desc: "Creates a new locator. Subject to your plan's locator limit.",
                payload: `{
  "name": "My New Locator",        // required
  "map_style": "standard",         // optional: standard|dark|minimal
  "primary_color": "#171717",      // optional: hex color
  "language": "en"                 // optional: default en
}`,
                response: `{
  "success": true,
  "data": {
    "id": "loc_xyz789",
    "name": "My New Locator",
    "status": "active",
    "created_at": "2026-07-01T10:00:00Z"
  }
}`,
            },
            {
                id: 'put-locator',
                method: 'PUT',
                tone: 'put',
                path: '/locators/:id',
                desc: 'Updates an existing locator. Only include the fields you want to change.',
                params: [
                    { name: 'id', in: 'path', type: 'string', required: true, desc: 'The locator ID to update' },
                ],
                payload: `{
  "name": "Updated Name",          // optional
  "map_style": "dark",             // optional
  "primary_color": "#ffe54c"       // optional
}`,
                response: `{
  "success": true,
  "data": {
    "id": "loc_abc123",
    "name": "Updated Name",
    "map_style": "dark",
    "updated_at": "2026-07-01T11:00:00Z"
  }
}`,
            },
            {
                id: 'del-locator',
                method: 'DELETE',
                tone: 'del',
                label: 'DEL',
                path: '/locators/:id',
                desc: 'Permanently deletes a locator and all its associated locations. This cannot be undone.',
                params: [
                    { name: 'id', in: 'path', type: 'string', required: true, desc: 'The locator ID to delete' },
                ],
                response: `{
  "success": true,
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
                id: 'post-location',
                method: 'POST',
                tone: 'post',
                path: '/locations',
                desc: "Creates a new location inside a locator. Subject to your plan's location limit.",
                payload: `{
  "locator_id": "loc_abc123",   // required
  "name": "SM Mall of Asia",    // required
  "city": "Pasay City",         // required
  "state": "Metro Manila",      // required
  "country": "Philippines",     // required
  "lat": 14.5353,               // required
  "lng": 120.9822,              // required
  "phone": "+63 2 8556 0100",   // optional
  "email": "moa@sm.com",        // optional
  "website": "https://sm.ph"    // optional
}`,
                response: `{
  "success": true,
  "data": {
    "id": "lct_001",
    "name": "SM Mall of Asia",
    "status": "active",
    "created_at": "2026-07-01T10:00:00Z"
  }
}`,
            },
            {
                id: 'put-location',
                method: 'PUT',
                tone: 'put',
                path: '/locations/:id',
                desc: 'Updates an existing location. Only include the fields you want to change.',
                params: [
                    { name: 'id', in: 'path', type: 'string', required: true, desc: 'The location ID to update' },
                ],
                payload: `{
  "name": "SM MOA Updated",     // optional
  "phone": "+63 2 9999 0000",   // optional
  "lat": 14.5360,               // optional
  "lng": 120.9830               // optional
}`,
                response: `{
  "success": true,
  "data": {
    "id": "lct_001",
    "name": "SM MOA Updated",
    "updated_at": "2026-07-01T12:00:00Z"
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
  "success": true,
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

export default function ApiAccessClient() {
    const [keyVisible, setKeyVisible] = useState(false);
    const [activeEndpointId, setActiveEndpointId] = useState(ALL_ENDPOINTS[0].id);
    const [regenOpen, setRegenOpen] = useState(false);

    const endpoint = ALL_ENDPOINTS.find((ep) => ep.id === activeEndpointId);

    const copyKey = () => {
        navigator.clipboard.writeText(API_KEY.value).catch(() => {});
        toast.success('API key copied to clipboard');
    };

    // TODO: call a server action to rotate the key once the API key backend lands.
    const regenerate = () => {
        setRegenOpen(false);
        toast.success('New API key generated — copy it now and update your integrations');
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
                    <div className={styles.statusPill}>
                        <span className={styles.statusDot} /> Active
                    </div>
                </div>

                <div className={styles.keyBox}>
                    <div className={styles.keyLabel}>
                        Bearer Token
                        <span className={styles.keySecure}><TbShieldCheck /> Secure</span>
                    </div>
                    <div className={styles.keyValueRow}>
                        <div className={`${styles.keyValue} ${keyVisible ? '' : styles.masked}`}>
                            {keyVisible ? API_KEY.value : MASKED_KEY}
                        </div>
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
                    </div>
                    <div className={styles.keyMeta}>
                        <div className={`${styles.keyMetaItem} ${styles.ok}`}><TbCircleCheck /> Active</div>
                        <div className={styles.keyMetaItem}><TbCalendar /> Created {API_KEY.created}</div>
                        <div className={styles.keyMetaItem}><TbClock /> Last used {API_KEY.lastUsed}</div>
                        <div className={styles.keyMetaItem}><TbInfinity /> Never expires</div>
                    </div>
                </div>

                <div className={styles.generateRow}>
                    <div className={styles.genInfo}>
                        <strong className={styles.genTitle}>Regenerate your key</strong>
                        Use this if your key is compromised. Your old key stops working immediately.
                    </div>
                    <button type="button" className={styles.btnGen} onClick={() => setRegenOpen(true)}>
                        <TbRefresh /> Regenerate Key
                    </button>
                </div>

                <div className={styles.warnBox}>
                    <TbAlertTriangle />
                    <p>
                        Never expose your API key in client-side JavaScript, public repos, or frontend
                        code. If compromised, regenerate it immediately.
                    </p>
                </div>
            </div>

            {/* USAGE EXAMPLE */}
            <div className={styles.apiCard}>
                <div className={styles.apiCardHeader}>
                    <div className={styles.apiCardTitle}><TbCode /> How to use your API key</div>
                </div>
                <div className={styles.usageIntro}>
                    Pass your key as a <span className={styles.ic}>Bearer</span> token in the{' '}
                    <span className={styles.ic}>Authorization</span> header of every request.
                </div>
                <CodeBlock lang="cURL" code={CURL_EXAMPLE} />
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
                        <button type="button" className={styles.apiRegenBtnConfirm} onClick={regenerate}>
                            <TbRefresh /> Regenerate Key
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
