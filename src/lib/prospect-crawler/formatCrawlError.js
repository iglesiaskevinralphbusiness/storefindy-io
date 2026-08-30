const TIMEOUT_SECONDS = 25;

export class CrawlError extends Error {
    constructor({ error, detail }) {
        super(error);
        this.name = 'CrawlError';
        this.detail = detail || '';
    }
}

export function formatCrawlError(error, { url = '' } = {}) {
    if (error instanceof CrawlError) {
        return error;
    }

    const message = [
        error?.message,
        error?.cause?.message,
        error?.details,
    ].filter(Boolean).join(' ');

    const lower = message.toLowerCase();

    if (/err_name_not_resolved|enotfound|getaddrinfo|name not resolved/i.test(message)) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: 'The domain name could not be resolved. Check that the URL is spelled correctly and that the site exists.',
        });
    }

    if (/navigation timeout|timeout.*exceeded|timed out/i.test(message)) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: `The site did not respond within ${TIMEOUT_SECONDS} seconds. It may be slow, offline, or blocking automated access.`,
        });
    }

    if (/err_connection_refused|econnrefused|connection refused/i.test(message)) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: 'The server refused the connection. The website may be down or not accepting requests.',
        });
    }

    if (/err_connection_reset|econnreset|connection reset/i.test(message)) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: 'The connection was reset while loading the page. The site may be unstable or blocking automated access.',
        });
    }

    if (/err_cert|ssl|certificate|tls/i.test(message)) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: 'There is an SSL/TLS certificate problem with this site, so the secure connection could not be established.',
        });
    }

    if (/403|forbidden/i.test(message)) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: 'Access was forbidden (HTTP 403). The site may block crawlers, use bot protection, or require login.',
        });
    }

    if (/401|unauthorized/i.test(message)) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: 'Access requires authentication (HTTP 401). This site cannot be analyzed without logging in.',
        });
    }

    if (/\b404\b|status code 404|returned 404|http response code failure/i.test(message)) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: url
                ? `${url} returned HTTP 404 (page not found). Try the full homepage URL, or check whether the site uses www.`
                : 'The page returned HTTP 404 (not found). Check that the URL path is correct.',
        });
    }

    if (/429|too many requests|rate limit/i.test(message)) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: 'The site returned too many requests (HTTP 429). It may be rate-limiting automated access.',
        });
    }

    if (/503|502|504|service unavailable|bad gateway|gateway timeout/i.test(message)) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: 'The server returned a temporary error. The site may be down or overloaded right now.',
        });
    }

    if (/err_blocked|blocked_by/i.test(message)) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: 'The request was blocked before the page could load. The site may use bot protection or a firewall.',
        });
    }

    if (/failed to launch|browser process|could not find chrome|executable doesn|\[object promise\]/i.test(lower)) {
        return new CrawlError({
            error: 'Unable to start the web crawler.',
            detail: 'Puppeteer could not launch Chrome/Chromium inside Next.js. Restart the dev server (`npm run dev`) so Next.js loads Puppeteer as an external package. If it still fails, run `npx puppeteer browsers install chrome` in the project folder.',
        });
    }

    if (/browser was not found|configured executablepath/i.test(lower)) {
        return new CrawlError({
            error: 'Unable to start the web crawler.',
            detail: 'Puppeteer could not resolve the Chrome/Chromium executable path. Run `npx puppeteer browsers install chrome`, then restart `npm run dev`.',
        });
    }

    const netError = message.match(/net::ERR_[A-Z_]+/i)?.[0];
    if (netError) {
        const netDetail = {
            'net::ERR_NAME_NOT_RESOLVED': 'The domain name could not be resolved.',
            'net::ERR_CONNECTION_REFUSED': 'The server refused the connection.',
            'net::ERR_CONNECTION_TIMED_OUT': 'The connection timed out before the site responded.',
            'net::ERR_CONNECTION_RESET': 'The connection was reset while loading the page.',
            'net::ERR_CERT_AUTHORITY_INVALID': 'The site has an invalid SSL certificate.',
            'net::ERR_CERT_COMMON_NAME_INVALID': 'The SSL certificate does not match this domain.',
            'net::ERR_SSL_PROTOCOL_ERROR': 'An SSL protocol error occurred.',
            'net::ERR_BLOCKED_BY_CLIENT': 'The request was blocked.',
            'net::ERR_BLOCKED_BY_RESPONSE': 'The site blocked the response (often bot protection).',
            'net::ERR_ABORTED': 'The page load was aborted.',
            'net::ERR_FAILED': 'The network request failed.',
        };

        return new CrawlError({
            error: 'Unable to access this website.',
            detail: netDetail[netError.toUpperCase()] || `Network error: ${netError}.`,
        });
    }

    if (message.includes('valid website') || message.includes('URL is required')) {
        return new CrawlError({
            error: message,
            detail: '',
        });
    }

    const firstLine = message.split('\n')[0]?.trim().slice(0, 220);
    if (firstLine && !/^\s*at\s/i.test(firstLine) && !firstLine.includes('.__')) {
        return new CrawlError({
            error: 'Unable to access this website.',
            detail: url
                ? `Could not load ${url}. ${firstLine}`
                : firstLine,
        });
    }

    return new CrawlError({
        error: 'Unable to access this website.',
        detail: url
            ? `Could not load ${url}. The site may be blocking bots, require login, or be temporarily unavailable.`
            : 'The site may be blocking bots, require login, or be temporarily unavailable.',
    });
}
