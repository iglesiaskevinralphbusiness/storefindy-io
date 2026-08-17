import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			// WordPress.org plugin directory assets (plugin screenshots).
			{ protocol: 'https', hostname: 'ps.w.org', pathname: '/**' },
		],
	},
};

export default withNextIntl(nextConfig);