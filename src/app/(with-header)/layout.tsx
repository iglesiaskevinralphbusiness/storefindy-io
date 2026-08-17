import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Suspense } from 'react';

import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '../../styles/globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TopLoadingBar from '@/components/TopLoadingBar';
import StoreProvider from '@/providers/StoreProvider';
import { organizationJsonLd, websiteJsonLd, SITE_URL } from '@/utils/constant/jsonld';

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: 'Storefindy – Store Locator Widget for Your Website',
		template: '%s | Storefindy',
	},
	description:
		'Create a store locator for your website in minutes. Fast, map-based, mobile-friendly. Free plan available — no credit card required.',
	robots: {
		index: true,
		follow: true,
	},
	icons: {
		icon: [
			{ url: '/images/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
			{ url: '/images/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
		],
		apple: [{ url: '/images/favicon/favicon-180x180.png', sizes: '180x180' }],
	},
};

export const viewport: Viewport = {
	themeColor: '#ffe54c',
};

type Props = {
	children: React.ReactNode;
};

export default async function RootLayout({ children }: Props) {
	const locale = await getLocale();
	const messages = await getMessages();

	return (
		<html lang={locale}>
			<body className="min-h-full flex flex-col">
				<Suspense fallback={null}>
					<TopLoadingBar />
				</Suspense>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
				/>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
				/>
				<StoreProvider>
					<NextIntlClientProvider locale={locale} messages={messages}>
						<Header />
						<main className="main">
							{children}
						</main>
						<Footer />
					</NextIntlClientProvider>
				</StoreProvider>
			</body>
		</html>
	);
}
