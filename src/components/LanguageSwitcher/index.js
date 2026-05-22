'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LOCALE_COOKIE } from '@/i18n/config';

const locales = [
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'Français' },
];

export default function LanguageSwitcher() {
	const locale = useLocale();
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const handleChange = (e) => {
		const nextLocale = e.target.value;

		document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;

		startTransition(() => {
			router.refresh();
		});
	};

	return (
		<select
			value={locale}
			onChange={handleChange}
			disabled={isPending}
			aria-label="Select language"
		>
			{locales.map(({ code, label }) => (
				<option key={code} value={code}>
					{label}
				</option>
			))}
		</select>
	);
}
