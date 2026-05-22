export const locales = ['en', 'fr'] as const;
export const defaultLocale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export type Locale = (typeof locales)[number];
