import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
	// `@huggingface/transformers` is browser-only here — every model runs in the
	// AI web worker (src/workers/ai-worker.js). Listing it (and the ONNX runtime
	// under it) as a server external package stops the server build from trying
	// to resolve its Node bindings, which it would otherwise pull in through the
	// package's `node` export condition.
	serverExternalPackages: [
		'puppeteer',
		'@puppeteer/browsers',
		'@huggingface/transformers',
		'onnxruntime-web',
		'onnxruntime-node',
	],
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