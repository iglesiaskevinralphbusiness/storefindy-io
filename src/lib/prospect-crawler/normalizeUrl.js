export function normalizeUrl(input) {
    const raw = (input || '').toString().trim();
    if (!raw) {
        throw new Error('URL is required.');
    }

    let url;
    try {
        url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    } catch {
        throw new Error('Please enter a valid website URL.');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported.');
    }

    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const siteUrl = url.href.split('#')[0];

    return {
        site_url: siteUrl,
        domain: hostname,
        origin: url.origin,
    };
}

export function getUrlCandidates(input) {
    const normalized = normalizeUrl(input);
    const candidates = new Set([normalized.site_url]);
    const parsed = new URL(normalized.site_url);

    const altHost = parsed.hostname.startsWith('www.')
        ? parsed.hostname.slice(4)
        : `www.${parsed.hostname}`;

    if (altHost !== parsed.hostname) {
        const alt = new URL(parsed.href);
        alt.hostname = altHost;
        candidates.add(alt.href.split('#')[0]);
    }

    if (parsed.pathname === '/') {
        candidates.add(`${parsed.origin}`);
    }

    return {
        ...normalized,
        candidates: [...candidates],
    };
}

export function isSameDomain(urlA, urlB) {
    try {
        const a = normalizeUrl(urlA);
        const b = normalizeUrl(urlB);
        return a.domain === b.domain;
    } catch {
        return false;
    }
}

export function toAbsoluteUrl(href, origin) {
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return null;
    }

    try {
        return new URL(href, origin).href;
    } catch {
        return null;
    }
}
