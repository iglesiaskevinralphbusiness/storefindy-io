'use client';
import styles from './Header.module.scss';
import { useState, useEffect } from 'react';
import Link from "next/link";
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useSelector } from 'react-redux';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { GiHamburgerMenu } from "react-icons/gi";

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { email, isLoggedIn } = useSelector(state => state.user);

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.classList.add("mobile-menu-open");
        } else {
            document.body.classList.remove("mobile-menu-open");
        }
    }, [mobileMenuOpen]);

    return (
        <header className={styles.header}>
            <div className={styles.headerContainer}>
                <div className={styles.headerLeft}>
                    <Link href="/">
                        Storefindy.com
                    </Link>
                </div>
                <nav className={styles.headerRight}>
                    <button type="button" className={styles.mobileMenuButton} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        <GiHamburgerMenu />
                    </button>
                    { isLoggedIn ? <HeaderLoggedOut mobileMenuOpen={mobileMenuOpen} email={email} /> : <HeaderLoggedIn mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} /> }
                </nav>
            </div>
        </header>
    );
}

const HeaderLoggedIn = ({ mobileMenuOpen }) => {
    const t = useTranslations('header');

    return <ul className={mobileMenuOpen ? styles.mobileMenuOpen : ''}>
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

const HeaderLoggedOut = ({ mobileMenuOpen, email }) => {
    const t = useTranslations('header');

    const handleSignOut = () => {
        signOut({ callbackUrl: '/' });
    };

    return <ul className={mobileMenuOpen ? styles.mobileMenuOpen : ''}>
        {
            !usePathname().includes('/dashboard') && (
                <li>
                    <Link href="/dashboard" className={styles.menuItem}>Dashboard</Link>
                </li>
            )
        }
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