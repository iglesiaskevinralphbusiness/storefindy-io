// Shared Open Graph / Twitter metadata helpers.
//
// Next.js replaces (does NOT deep-merge) the `openGraph` and `twitter` metadata
// fields across route segments, so every page that wants social previews must
// declare a complete block — including the image. These helpers keep that block
// consistent and DRY. `metadataBase` is set once in (with-header)/layout.tsx, so
// the relative image path below resolves to an absolute URL automatically.

import { SITE_URL } from './jsonld';

export const OG_IMAGE = {
    url: '/images/hero-demo.png',
    width: 1909,
    height: 764,
    alt: 'Storefindy store locator widget preview',
};

/**
 * Build the `openGraph` and `twitter` metadata for a page.
 *
 * @param {object} opts
 * @param {string} opts.title       Social-preview title.
 * @param {string} opts.description Social-preview description.
 * @param {string} [opts.path='/']  Path relative to the site root (e.g. '/about-us').
 * @param {'website'|'article'} [opts.type='website'] Open Graph type.
 */
export function buildSocialMetadata({ title, description, path = '/', type = 'website' }) {
    const url = `${SITE_URL}${path}`;
    return {
        alternates: { canonical: path },
        openGraph: {
            type,
            url,
            siteName: 'Storefindy',
            title,
            description,
            images: [OG_IMAGE],
            locale: 'en_US',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [OG_IMAGE.url],
        },
    };
}
