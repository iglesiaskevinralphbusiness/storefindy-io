import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
	serverExternalPackages: ['puppeteer', '@puppeteer/browsers'],
	images: {
		remotePatterns: [
			// WordPress.org plugin directory assets (plugin screenshots).
			{ protocol: 'https', hostname: 'ps.w.org', pathname: '/**' },
			// Shopify App Store listing assets (app screenshots).
			{ protocol: 'https', hostname: 'cdn.shopify.com', pathname: '/app-store/**' },
		],
	},
};

export default withNextIntl(nextConfig);