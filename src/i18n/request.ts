import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, LOCALE_COOKIE, locales, type Locale } from './config';

const messageImports: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
	en: () => import('../messages/en.json'),
	fr: () => import('../messages/fr.json'),
};

export default getRequestConfig(async () => {
	const cookieStore = await cookies();
	let locale = cookieStore.get(LOCALE_COOKIE)?.value ?? defaultLocale;

	if (!locales.includes(locale as Locale)) {
		locale = defaultLocale;
	}

	const messages = (await messageImports[locale as Locale]()).default;

	return { locale, messages };
});
