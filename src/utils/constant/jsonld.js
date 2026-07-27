// Site-wide structured data. Rendered once in (with-header)/layout.tsx so it
// appears on every public page. Page-specific schema (FAQ, pricing, etc.)
// lives in the individual page files.

export const SITE_URL = 'https://www.storefindy.com';

export const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Storefindy',
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    description: 'Storefindy is a store locator widget for your website — fast, map-based, mobile-friendly, and embeddable on any site.',
    // Add verified profile URLs here (e.g. 'https://x.com/storefindy') to
    // strengthen brand entity recognition.
    sameAs: [],
    contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@storefindy.com',
        url: `${SITE_URL}/contact-us`,
    },
};

export const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Storefindy',
    url: SITE_URL,
    description: 'Store locator widget for your website — fast, map-based, mobile-friendly, and embeddable on any site.',
    publisher: {
        '@type': 'Organization',
        name: 'Storefindy',
        url: SITE_URL,
    },
};
