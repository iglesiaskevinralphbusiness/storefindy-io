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
                        Toolifier.io
                    </Link>
                </div>
                <div className={styles.headerRight}>
                    <ul>
                        <li className={styles.lang}>
                            <LanguageSwitcher />
                        </li>
                        <li>
                            <Link href="/"><HiOutlineInformationCircle /></Link>
                            <span>{t('About Us')}</span>
                        </li>
                        <li>
                            <button><TbMoon /></button>
                            <span>{t('Dark Mode')}</span>
                        </li>
                        <li className={styles.buyMeACoffee}>
                            <Link href="#">{t('Buy me a coffee')} <FaRegHeart /></Link>
                            <span>{t('Support Us')}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </header>
    );
}