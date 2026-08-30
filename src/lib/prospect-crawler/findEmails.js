const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const PREFERRED_PREFIXES = [
    'info',
    'hello',
    'contact',
    'sales',
    'support',
    'enquiries',
    'inquiry',
    'help',
    'office',
    'team',
];

const IGNORED_DOMAINS = new Set([
    'example.com',
    'email.com',
    'domain.com',
    'sentry.io',
    'wixpress.com',
    'cloudflare.com',
]);

const IGNORED_SUFFIXES = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.css', '.js'];

function cleanEmail(value) {
    return value.toLowerCase().replace(/^mailto:/, '').split('?')[0].trim();
}

function isLikelyValidEmail(email) {
    if (!email || email.length > 120) return false;
    if (IGNORED_SUFFIXES.some((suffix) => email.endsWith(suffix))) return false;

    const domain = email.split('@')[1];
    if (!domain || IGNORED_DOMAINS.has(domain)) return false;
    if (domain.endsWith('.webp') || domain.endsWith('.png')) return false;

    return true;
}

function classifyEmail(email) {
    const local = email.split('@')[0] || '';
    if (PREFERRED_PREFIXES.some((prefix) => local === prefix || local.startsWith(`${prefix}.`))) {
        return 'business';
    }
    return 'general';
}

function scoreEmail(email, type) {
    const local = email.split('@')[0] || '';
    let score = type === 'business' ? 70 : 40;

    if (PREFERRED_PREFIXES.includes(local)) {
        score += 20;
    }

    if (local.includes('noreply') || local.includes('no-reply') || local.includes('donotreply')) {
        score -= 50;
    }

    return Math.max(0, Math.min(100, score));
}

export function extractEmailsFromText(text, sourceUrl = '') {
    if (!text) return [];

    const matches = text.match(EMAIL_RE) || [];
    const seen = new Set();
    const results = [];

    for (const match of matches) {
        const email = cleanEmail(match);
        if (!isLikelyValidEmail(email) || seen.has(email)) continue;
        seen.add(email);

        const type = classifyEmail(email);
        results.push({
            email,
            source_url: sourceUrl,
            type,
            confidence: scoreEmail(email, type),
        });
    }

    return results.sort((a, b) => b.confidence - a.confidence);
}

export function pickBestEmail(emails = []) {
    if (!emails.length) return '';
    return emails[0].email;
}
