import { normalizeUrl, getUrlCandidates, toAbsoluteUrl } from './normalizeUrl';
import { extractEmailsFromText } from './findEmails';
import { detectStoreLocatorFromPages, inspectPageForLocatorSignals, isConfirmedStoreLocatorPage } from './detectStoreLocator';
import { detectLocationsFromPages, scoreProspect } from './findLocations';
import { formatCrawlError, CrawlError } from './formatCrawlError';

const MAX_PAGES = 6;
const NAVIGATION_TIMEOUT_MS = 25000;
const PAGE_WAIT_MS = 1500;
const LOCATOR_PAGE_WAIT_MS = 6000;

async function dismissCookieBanner(page) {
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
        const acceptButton = buttons.find((button) => /accept all|allow all|agree|accept cookies/i.test((button.textContent || '').trim()));
        acceptButton?.click();
    }).catch(() => {});
}

async function waitForLocatorWidget(page) {
    const url = page.url();
    const isLocatorUrl = /store-finder|store-locator|find-a-store|location-finder|\/locations\/?(?:$|[?#])/i.test(url);

    if (!isLocatorUrl) {
        await new Promise((resolve) => setTimeout(resolve, PAGE_WAIT_MS));
        return;
    }

    await dismissCookieBanner(page);

    try {
        await page.waitForFunction(() => {
            const container = document.querySelector(
                '#storepoint-container, #store-finder, [class*="store-locator"], .locationsform, .lsform__map, [class*="locations-search"]'
            );
            if (!container) {
                return !!document.querySelector('.gm-style, .leaflet-container, .mapboxgl-map, .lsform__map');
            }

            return container.querySelector('iframe, canvas, input, textarea, [role="searchbox"], .leaflet-container, .mapboxgl-map, .gm-style, [class*="marker"]')
                || (container.innerHTML || '').length > 100;
        }, { timeout: LOCATOR_PAGE_WAIT_MS });
    } catch {
        await new Promise((resolve) => setTimeout(resolve, LOCATOR_PAGE_WAIT_MS));
    }
}

const PRIORITY_PATH_KEYWORDS = [
    'location',
    'locations',
    'store',
    'stores',
    'branch',
    'branches',
    'contact',
    'about',
    'find-us',
    'findus',
    'where',
    'dealer',
    'retailers',
];

let browserInstance = null;

async function getBrowser() {
    if (browserInstance?.isConnected?.()) {
        return browserInstance;
    }

    let puppeteerModule;
    try {
        puppeteerModule = await import('puppeteer');
    } catch (error) {
        throw formatCrawlError(error, { phase: 'browser_import' });
    }

    const puppeteer = puppeteerModule.default ?? puppeteerModule;
    const launchOptions = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    };

    try {
        const executablePath = puppeteer.executablePath();
        launchOptions.executablePath = typeof executablePath?.then === 'function'
            ? await executablePath
            : executablePath;
    } catch {
        // Fall back to Puppeteer's default Chromium resolution.
    }

    try {
        browserInstance = await puppeteer.launch(launchOptions);
    } catch (error) {
        browserInstance = null;
        throw formatCrawlError(error, { phase: 'browser_launch' });
    }

    return browserInstance;
}

async function closeBrowser() {
    if (browserInstance) {
        await browserInstance.close().catch(() => {});
        browserInstance = null;
    }
}

function scoreLink(url, origin) {
    const lower = url.toLowerCase();
    if (!lower.startsWith(origin)) return -1;

    let score = 0;
    for (const keyword of PRIORITY_PATH_KEYWORDS) {
        if (lower.includes(keyword)) {
            score += 10;
        }
    }
    return score;
}

async function collectInternalLinks(page, origin) {
    const hrefs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
            .map((anchor) => anchor.getAttribute('href'))
            .filter(Boolean);
    });

    const scored = hrefs
        .map((href) => toAbsoluteUrl(href, origin))
        .filter((href) => href && href.startsWith(origin))
        .map((href) => ({ href, score: scoreLink(href, origin) }))
        .filter((entry) => entry.score >= 0)
        .sort((a, b) => b.score - a.score);

    const unique = [];
    const seen = new Set();

    for (const entry of scored) {
        const key = entry.href.split('#')[0];
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(key);
    }

    return unique.slice(0, MAX_PAGES - 1);
}

function normalizeCrawledPage(page) {
    return {
        url: page.url,
        title: page.title,
        text: page.text,
        html: page.html,
        hasMap: page.hasMap,
        hasLocationSearch: page.hasLocationSearch,
        hasMultiLocationSearch: page.hasMultiLocationSearch,
        hasLocationResultsList: page.hasLocationResultsList,
        hasMultipleLocationResults: page.hasMultipleLocationResults,
        hasStoreLocatorEmbed: page.hasStoreLocatorEmbed,
        isDedicatedLocatorPage: page.isDedicatedLocatorPage,
        hasLocatorPageContent: page.hasLocatorPageContent,
        hasGoogleMapsIntegration: page.hasGoogleMapsIntegration,
        hasCustomLocatorPlugin: page.hasCustomLocatorPlugin,
        hasLocatorMapShell: page.hasLocatorMapShell,
        mentionsMultipleStores: page.mentionsMultipleStores,
        isLocalLandingPage: page.isLocalLandingPage,
        addressCount: page.addressCount,
        locationResultCount: page.locationResultCount,
        locationMarkerCount: page.locationMarkerCount,
        matchedSelectors: page.matchedSelectors,
        locationLinkCount: page.locationLinkCount,
    };
}

async function visitPage(browser, url, origin) {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);

    try {
        await page.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        const response = await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: NAVIGATION_TIMEOUT_MS,
        });
        await waitForLocatorWidget(page);

        const signals = await inspectPageForLocatorSignals(page);
        const status = response?.status() ?? 0;
        const hasContent = (signals.text || '').trim().length > 200;

        if (status === 404 && !hasContent) {
            throw new CrawlError({
                error: 'Unable to access this website.',
                detail: `${page.url() || url} returned HTTP 404 (page not found). Try the full homepage URL, or check whether the site uses www.`,
            });
        }

        if (status >= 500 && !hasContent) {
            throw new Error(`HTTP ${status}`);
        }

        const locationLinkCount = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            return anchors.filter((anchor) => {
                const href = (anchor.getAttribute('href') || '').toLowerCase();
                const text = (anchor.textContent || '').toLowerCase();
                return /location|store|branch|dealer|find-us|find us/.test(`${href} ${text}`);
            }).length;
        });

        const resolvedOrigin = new URL(page.url()).origin;
        const internalLinks = await collectInternalLinks(page, resolvedOrigin);

        return {
            url: page.url() || url,
            http_status: status,
            ...signals,
            locationLinkCount,
            internalLinks,
        };
    } catch (error) {
        throw formatCrawlError(error, { url });
    } finally {
        await page.close().catch(() => {});
    }
}

async function loadInitialPage(browser, candidates = []) {
    let lastError = null;

    for (const candidate of candidates) {
        try {
            const origin = new URL(candidate).origin;
            const pageData = await visitPage(browser, candidate, origin);
            return pageData;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || formatCrawlError(new Error('Unable to load website'), { url: candidates[0] });
}

export async function crawlWebsite(inputUrl) {
    const { site_url, domain, candidates } = getUrlCandidates(inputUrl);
    let browser;

    try {
        browser = await getBrowser();
        const pages = [];
        let companyName = '';

        const firstPage = await loadInitialPage(browser, candidates);
        pages.push(firstPage);

        const origin = new URL(firstPage.url).origin;
        const visited = new Set([firstPage.url.split('#')[0]]);
        let queue = [...(firstPage.internalLinks || [])];

        if (!companyName && firstPage.title) {
            companyName = firstPage.title.split('|')[0].split('-')[0].trim();
        }

        if (isConfirmedStoreLocatorPage(normalizeCrawledPage(firstPage))) {
            queue = [];
        }

        while (queue.length && pages.length < MAX_PAGES) {
            const currentUrl = queue.shift();
            const key = currentUrl.split('#')[0];
            if (visited.has(key)) continue;
            visited.add(key);

            const pageData = await visitPage(browser, key, origin);
            pages.push(pageData);

            if (!companyName && pageData.title) {
                companyName = pageData.title.split('|')[0].split('-')[0].trim();
            }

            if (isConfirmedStoreLocatorPage(normalizeCrawledPage(pageData))) {
                break;
            }

            for (const link of pageData.internalLinks || []) {
                if (!visited.has(link) && !queue.includes(link)) {
                    queue.push(link);
                }
            }
        }

        const normalizedPages = pages.map(normalizeCrawledPage);

        const locator = detectStoreLocatorFromPages(normalizedPages);
        const locations = detectLocationsFromPages(normalizedPages);

        const emailsFound = [];
        const seenEmails = new Set();
        for (const page of normalizedPages) {
            for (const entry of extractEmailsFromText(`${page.text}\n${page.html}`, page.url)) {
                if (seenEmails.has(entry.email)) continue;
                seenEmails.add(entry.email);
                emailsFound.push(entry);
            }
        }
        emailsFound.sort((a, b) => b.confidence - a.confidence);

        const email = emailsFound[0]?.email || '';
        const scoring = scoreProspect({
            has_store_locator: locator.has_store_locator,
            has_multiple_locations: locations.has_multiple_locations,
            estimated_location_count: locations.estimated_location_count,
            email,
            emails_found: emailsFound,
            existing_locator: locator.existing_locator || '',
        });

        return {
            site_url: new URL(firstPage.url).origin + '/',
            domain,
            company_name: companyName,
            email,
            emails_found: emailsFound,
            ...locator,
            ...locations,
            ...scoring,
        };
    } catch (error) {
        throw formatCrawlError(error, { url: site_url });
    } finally {
        await closeBrowser();
    }
}

export async function analyzeWebsite(inputUrl) {
    return crawlWebsite(inputUrl);
}
