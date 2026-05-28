'use client';

import styles from './Header.module.scss';
import Link from "next/link";
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useSelector } from 'react-redux';
import { signOut } from 'next-auth/react';

export default function Header() {
    const { email, isLoggedIn } = useSelector(state => state.user);

    return (
        <header className={styles.header}>
            <div className={styles.headerContainer}>
                <div className={styles.headerLeft}>
                    <Link href="/">
                        Storefindy.io
                    </Link>
                </div>
                <nav className={styles.headerRight}>
                    { isLoggedIn ? <HeaderLoggedOut email={email} /> : <HeaderLoggedIn /> }
                </nav>
            </div>
        </header>
    );
}

const HeaderLoggedIn = () => {
    const t = useTranslations('header');

    return <ul>
        <li>
            <Link href="/" className={styles.menuItem}>{t('Demo')}</Link>
        </li>
        <li>
            <Link href="/" className={styles.menuItem}>{t('Features')}</Link>
        </li>
        <li>
            <Link href="/sign-in" className={styles.menuItem}>{t('Sign In')}</Link>
        </li>
        <li className={styles.register}>
            <Link href="/sign-up" className="buttonBox" role="button">{t('Create Store Locator')} </Link>
        </li>
        <li className={styles.lang}>
            <LanguageSwitcher />
        </li>
    </ul>
}

const HeaderLoggedOut = ({ email }) => {
    const t = useTranslations('header');

    const handleSignOut = () => {
        signOut({ callbackUrl: '/' });
    };

    return <ul>
        <li>
            <Link href="/dashboard" className={styles.menuItem}>Dashboard</Link>
        </li>
        <li>
            <button
                type="button"
                onClick={handleSignOut}
                className={styles.menuItem}
            >
                {t('Sign Out')}
            </button>
        </li>
        <li className={styles.lang}>
            <LanguageSwitcher />
        </li>
    </ul>
}