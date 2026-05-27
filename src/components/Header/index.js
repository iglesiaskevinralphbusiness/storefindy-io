'use client';

import styles from './Header.module.scss';
import Link from "next/link";
import Image from "next/image";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { TbMoon } from "react-icons/tb";
import { FaRegHeart } from "react-icons/fa6";
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Header() {
    const t = useTranslations('header');

    return (
        <header className={styles.header}>
            <div className={styles.headerContainer}>
                <div className={styles.headerLeft}>
                    <Link href="/">
                        Storefindy.io
                    </Link>
                </div>
                <nav className={styles.headerRight}>
                    <ul>
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
                            <Link href="#" className="buttonBox" role="button">{t('Create Store Locator')} </Link>
                        </li>
                        <li className={styles.lang}>
                            <LanguageSwitcher />
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    );
}