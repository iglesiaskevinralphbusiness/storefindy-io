const LOCATOR_TEXT_PATTERNS = [
    /store\s*locator/i,
    /find\s+a\s+store/i,
    /find\s+a\s+location/i,
    /find\s+your\s+nearest/i,
    /location\s+finder/i,
    /dealer\s+locator/i,
    /branch\s+locator/i,
];

const STORE_LOCATOR_PATH_PATTERN = /\/(store-finder|store-locator|find-a-store|find-a-location|location-finder|dealer-locator|locations\/find)(\/|$)/i;

const DEDICATED_LOCATOR_PATH_PATTERN = /\/(store-finder|store-locator|find-a-store|find-a-location|location-finder|dealer-locator|locations\/find|locations|stores|branches|find-us|where-to-buy)\/?$/i;

export const TARGET_LOCATOR_PROVIDERS = [
    {
        id: 'storepoint.co',
        patterns: [
            /storepoint\.co/i,
            /cdn\.storepoint/i,
            /app\.storepoint/i,
            /widgets\.storepoint/i,
            /storepoint-container/i,
            /id=["']storepoint-container["']/i,
        ],
    },
    {
        id: 'locatestore.com',
        patterns: [/locatestore\.com/i, /cdn\.locatestore/i, /locatestore-widget/i],
    },
    {
        id: 'stockist.co',
        patterns: [/stockist\.co/i, /cdn\.stockist/i, /stockist\.io/i, /stockist-widget/i, /stockist\.js/i],
    },
];

const OTHER_COMPETITOR_PATTERNS = [
    /storefindy/i,
    /storemapper/i,
    /bullseye\s+locations/i,
    /mappedin/i,
    /store\s+rocket/i,
    /where\s+to\s+buy/i,
    /locations-search/i,
    /wp-store-locator/i,
    /agile-store-locator/i,
];

const CUSTOM_LOCATOR_PLUGIN_PATTERN = /locations-search|locationsform|wp-store-locator|store-locator-le|asl-search|agile-store-locator|dealer-locator|branch-locator/i;

const LOCATOR_EMBED_SELECTORS = [
    '#storepoint-container',
    '[id*="storepoint"]',
    '.stockist-widget',
    '[class*="stockist"]',
    '[class*="storemapper"]',
    '[data-storemapper]',
    '[class*="locatestore"]',
];

function detectTargetLocatorProvider(text = '', html = '') {
    const haystack = `${text}\n${html}`.toLowerCase();

    for (const provider of TARGET_LOCATOR_PROVIDERS) {
        if (provider.patterns.some((pattern) => pattern.test(haystack))) {
            return provider.id;
        }
    }

    return '';
}

export function isConfirmedStoreLocatorPage(page) {
    if (!page || page.isLocalLandingPage) {
        return false;
    }

    const text = `${page.title || ''} ${page.text || ''}`;
    const html = page.html || '';

    if (detectTargetLocatorProvider(text, html)) {
        return true;
    }

    if (page.hasStoreLocatorEmbed && page.isDedicatedLocatorPage) {
        return true;
    }

    if (page.hasMap && page.hasMultipleLocationResults && page.hasMultiLocationSearch) {
        return true;
    }

    if (
        page.isDedicatedLocatorPage
        && page.hasLocatorPageContent
        && page.hasMap
        && page.hasMultipleLocationResults
    ) {
        return true;
    }

    const hasLocatorMapEvidence = page.hasMap
        || page.hasLocatorMapShell
        || page.hasGoogleMapsIntegration
        || page.hasCustomLocatorPlugin;

    if (page.isDedicatedLocatorPage && page.hasMultiLocationSearch && hasLocatorMapEvidence) {
        return true;
    }

    if (page.isDedicatedLocatorPage && page.hasLocatorPageContent && page.hasMultiLocationSearch) {
        return true;
    }

    return false;
}

export function detectStoreLocatorFromPages(pages = []) {
    let confidence = 0;
    const evidence = [];
    let existing_locator = '';
    let localLandingPages = 0;

    for (const page of pages) {
        const text = `${page.title || ''} ${page.text || ''}`;
        const html = page.html || '';
        const textLower = text.toLowerCase();
        const htmlLower = html.toLowerCase();

        const targetProvider = detectTargetLocatorProvider(text, html);
        if (targetProvider && !existing_locator) {
            existing_locator = targetProvider;
            confidence += 45;
            evidence.push(`${targetProvider} widget detected on ${page.url}`);
        }

        if (page.isLocalLandingPage) {
            localLandingPages += 1;
            evidence.push(`Local landing page with single-location map (not a store locator): ${page.url}`);
            continue;
        }

        if (page.hasStoreLocatorEmbed) {
            confidence += 35;
            evidence.push(`Store locator widget embed detected on ${page.url}`);
        }

        if (page.hasCustomLocatorPlugin) {
            confidence += 30;
            evidence.push(`Custom store locator plugin detected on ${page.url}`);
        }

        if (page.hasGoogleMapsIntegration && page.hasMultiLocationSearch) {
            confidence += 25;
            evidence.push(`Google Maps store search detected on ${page.url}`);
        }

        if (page.isDedicatedLocatorPage && page.hasLocatorPageContent) {
            evidence.push(`Dedicated store locator page: ${page.url}`);
        }

        for (const pattern of OTHER_COMPETITOR_PATTERNS) {
            if (pattern.test(textLower) || pattern.test(htmlLower)) {
                confidence += 35;
                evidence.push(`Competitor or locator widget detected on ${page.url}`);
            }
        }

        if (isConfirmedStoreLocatorPage(page)) {
            confidence += 40;
            evidence.push(`Store locator confirmed on ${page.url}`);
        } else if (page.hasMultiLocationSearch && page.hasMap && !page.hasMultipleLocationResults) {
            evidence.push(`Search form and map on ${page.url}, but multiple location results were not detected`);
        } else if (page.hasMap && page.hasMultipleLocationResults && !page.hasMultiLocationSearch) {
            evidence.push(`Map with multiple locations on ${page.url}, but no location search form was detected`);
        }
    }

    confidence = Math.min(100, confidence);

    const hasConfirmedLocatorPage = pages.some(isConfirmedStoreLocatorPage);
    const has_store_locator = hasConfirmedLocatorPage || Boolean(existing_locator);

    return {
        has_store_locator,
        store_locator_confidence: confidence,
        store_locator_evidence: [...new Set(evidence)].slice(0, 12),
        existing_locator,
        local_landing_page_count: localLandingPages,
        crawl_stopped_early: hasConfirmedLocatorPage,
    };
}

export async function inspectPageForLocatorSignals(page) {
    return page.evaluate(() => {
        const mapSelectors = [
            'iframe[src*="google.com/maps"]',
            'iframe[src*="maps.google"]',
            'iframe[src*="mapbox"]',
            'iframe[src*="openstreetmap"]',
            '.leaflet-container',
            '.mapboxgl-map',
            '.gm-style',
            '.gm-style-cc',
            '#store-finder canvas',
            '#storepoint-container canvas',
            '#store-finder iframe',
            '#storepoint-container iframe',
        ];

        const mapShellSelectors = [
            '.lsform__map',
            '.locationsform',
            '[class*="locationsform"]',
            '[class*="location-map"]',
            '[class*="store-map"]',
            '[class*="locator-map"]',
            '#map',
            '#store-map',
            '.map-container',
            '[data-map]',
        ];

        const locatorShellSelectors = [
            '#store-finder',
            '#storepoint-container',
            '[class*="store-locator"]',
            '[class*="storelocator"]',
            '[id*="store-locator"]',
            '[id*="storelocator"]',
            '[data-store-locator]',
            '[data-locator]',
            '.locationsform',
            '.locationsform__form',
            '[class*="locations-search"]',
        ];

        const matchedSelectors = [
            ...mapSelectors,
            ...locatorShellSelectors,
        ].filter((selector) => document.querySelector(selector));

        const locatorEmbedSelectors = [
            '#storepoint-container',
            '[id*="storepoint"]',
            '.stockist-widget',
            '[class*="stockist"]',
            '[class*="storemapper"]',
            '[data-storemapper]',
            '[class*="locatestore"]',
        ];

        const htmlLower = document.documentElement.outerHTML.toLowerCase();
        const hasStoreLocatorEmbed = locatorEmbedSelectors.some((selector) => document.querySelector(selector))
            || /storepoint-container|stockist-widget|storemapper|locatestore/.test(htmlLower);

        const path = window.location.pathname.toLowerCase();
        const isDedicatedLocatorPage = /\/(store-finder|store-locator|find-a-store|find-a-location|location-finder|dealer-locator|locations\/find|locations|stores|branches|find-us|where-to-buy)\/?$/i.test(path)
            || path.includes('store-finder')
            || path.includes('store-locator');

        const bodyText = document.body?.innerText || '';
        const bodyLower = bodyText.toLowerCase();
        const titleLower = (document.title || '').toLowerCase();
        const hasLocatorPageContent = /store locator|find a store|find your nearest|find a location|bubble tea near me|find a .{0,24} near you|near you/i.test(bodyLower)
            || /store locator|find a store|find your nearest|^locations\b|\blocations\b/i.test(titleLower);

        const hasGoogleMapsIntegration = /maps\.googleapis\.com\/maps\/api\/js/.test(htmlLower)
            || !!document.querySelector('.gm-style, .gm-style-cc, [class*="gmnoprint"], [aria-label*="Google Map"]');

        const hasCustomLocatorPlugin = /locations-search|locationsform|wp-store-locator|store-locator-le|asl-search|agile-store-locator|dealer-locator|branch-locator/i.test(htmlLower)
            || !!document.querySelector('.locationsform, .locationsform__form, [class*="locations-search"], [class*="store-locator"]');

        const hasLocatorMapShell = mapShellSelectors.some((selector) => document.querySelector(selector));

        const mentionsMultipleStores = /\b\d+\+?\s*(?:stores|locations|branches|markets)\b/i.test(bodyText)
            || /over \d+\s+stores/i.test(bodyText)
            || /opened over \d+/i.test(bodyText);

        const multiSearchPattern = /zip|postal|postcode|find a store|find store|store locator|search locations|near me|enter (your )?(city|address|location)|search area|within \d+|radius|locator|search stores|find nearest|your location|current location/i;
        const contactFormPattern = /contact us|send message|your email|email address|phone number|subject|newsletter|sign up|get in touch|full name/i;

        let hasMultiLocationSearch = false;

        const searchScopes = [
            document.querySelector('#store-finder'),
            document.querySelector('#storepoint-container'),
            document.querySelector('[class*="store-locator"]'),
            document.querySelector('[class*="storelocator"]'),
            document.body,
        ].filter(Boolean);

        for (const scope of searchScopes) {
            const inputs = Array.from(scope.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [role="searchbox"]'));

            for (const input of inputs) {
                const form = input.closest('form');
                const attrs = [
                    input.getAttribute('name'),
                    input.getAttribute('id'),
                    input.getAttribute('placeholder'),
                    input.getAttribute('aria-label'),
                    input.getAttribute('type'),
                ].filter(Boolean).join(' ').toLowerCase();
                const formText = form ? form.innerText.slice(0, 600).toLowerCase() : '';

                const looksLikeContactForm = contactFormPattern.test(formText)
                    && !multiSearchPattern.test(formText)
                    && !multiSearchPattern.test(attrs);

                if (looksLikeContactForm) {
                    continue;
                }

                if (multiSearchPattern.test(attrs) || (form && multiSearchPattern.test(formText))) {
                    hasMultiLocationSearch = true;
                    break;
                }
            }

            if (hasMultiLocationSearch) {
                break;
            }

            const buttons = Array.from(scope.querySelectorAll('button, [role="button"], a'));
            if (buttons.some((button) => multiSearchPattern.test((button.textContent || '').toLowerCase()))) {
                hasMultiLocationSearch = true;
                break;
            }
        }

        const addressMatches = bodyText.match(
            /\d{1,5}\s+[A-Za-z0-9.'\- ]+(?:street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)\b/gi
        ) || [];

        const locationListSelectors = [
            '[class*="location-item"]',
            '[class*="store-item"]',
            '[class*="branch-item"]',
            '[class*="locator-result"]',
            '[data-location-id]',
            '[class*="store-list"] li',
            '[class*="location-list"] li',
            '[class*="branch-list"] li',
            '[class*="location-result"]',
            '[class*="store-result"]',
        ];

        let locationResultCount = 0;
        for (const selector of locationListSelectors) {
            locationResultCount = Math.max(locationResultCount, document.querySelectorAll(selector).length);
        }

        const markerSelectors = [
            '.leaflet-marker-icon',
            '.mapboxgl-marker',
            '[class*="marker"]',
            '[class*="map-pin"]',
            '[class*="location-pin"]',
            '[data-marker]',
            '[data-pin]',
        ];

        let locationMarkerCount = 0;
        for (const selector of markerSelectors) {
            locationMarkerCount = Math.max(locationMarkerCount, document.querySelectorAll(selector).length);
        }

        const hasLocationResultsList = locationResultCount >= 2;
        const hasMultipleMapMarkers = locationMarkerCount >= 2;
        const hasMultipleLocationResults = hasLocationResultsList
            || hasMultipleMapMarkers
            || (mentionsMultipleStores && (isDedicatedLocatorPage || hasStoreLocatorEmbed));

        const hasMap = matchedSelectors.some((selector) => mapSelectors.includes(selector))
            || hasLocatorMapShell
            || hasGoogleMapsIntegration
            || !!document.querySelector('#store-finder canvas, #storepoint-container canvas, .leaflet-container, .mapboxgl-map, iframe[src*="google.com/maps"], .gm-style, .lsform__map')
            || !!document.querySelector('canvas');

        const localLandingPath = /\/(store|stores|location|locations|branch|branches|find-us|visit-us|visit|shop)\/[^/]+/i.test(path)
            && !isDedicatedLocatorPage;

        const singleStoreTitle = /(store|branch|location)\s*(in|at|-)\s/i.test(document.title || '');

        const isLocalLandingPage = hasMap
            && !hasMultiLocationSearch
            && !hasMultipleLocationResults
            && !hasStoreLocatorEmbed
            && !isDedicatedLocatorPage
            && (addressMatches.length <= 1 || localLandingPath || singleStoreTitle);

        return {
            title: document.title || '',
            text: bodyText.slice(0, 120000),
            html: document.documentElement?.outerHTML?.slice(0, 250000) || '',
            hasMap,
            hasMultiLocationSearch,
            hasLocationSearch: hasMultiLocationSearch,
            hasLocationResultsList,
            hasMultipleLocationResults,
            hasStoreLocatorEmbed,
            isDedicatedLocatorPage,
            hasLocatorPageContent,
            hasGoogleMapsIntegration,
            hasCustomLocatorPlugin,
            hasLocatorMapShell,
            mentionsMultipleStores,
            isLocalLandingPage,
            addressCount: addressMatches.length,
            locationResultCount: Math.max(locationResultCount, locationMarkerCount),
            locationMarkerCount,
            matchedSelectors,
        };
    });
}
