'use client';
import { useState, useEffect } from 'react';
import styles from './AdminSidebar.module.scss';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LuChevronLeft, LuChevronRight, LuHouse, LuShieldCheck, LuUsers, LuStore, LuBug, LuLifeBuoy, LuMailSearch, LuSend, LuCircleUser } from "react-icons/lu";
import { useSelector } from 'react-redux';

export default function SidebarAdmin() {
    const [isMinimized, setIsMinimized] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('sidebarMinimized') === 'true';
    });
    const { email } = useSelector(state => state.user);

    useEffect(() => {
        window.localStorage.setItem('sidebarMinimized', String(isMinimized));
    }, [isMinimized]);

    const isRootLinkActive = (value) => {
        return usePathname() === value ? styles.active : '';
    }

    const isRootLinkParamsActive = (value) => {
        return usePathname().includes(value) ? styles.active : '';
    }

    const isSubLinkActive = (value) => {
        return value.some(v => usePathname().includes(v)) ? styles.active : '';
    }

    const [isLocatorMenuOpen, setIsLocatorMenuOpen] = useState(isSubLinkActive(['/dashboard/locators', '/dashboard/locators/create', '/dashboard/locators/customize', '/dashboard/locators/embed']));
    const [isLocationsMenuOpen, setIsLocationsMenuOpen] = useState(isSubLinkActive(['/dashboard/locations', '/dashboard/locations/add-location', '/dashboard/locations/import-csv']));
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(isSubLinkActive(['/dashboard/profile', '/dashboard/api-access', '/dashboard/billing', '/dashboard/notifications']));

    return (
        <>
            <div className={`${styles.sidebar} ${isMinimized ? styles.minimized : ''}`}>
                <button
                    type="button"
                    className={styles.expandButton}
                    onClick={() => setIsMinimized(!isMinimized)}
                >
                    { isMinimized ? <LuChevronRight /> : <LuChevronLeft /> }
                </button>
                <div className={styles.menus}>
                    <h2>MAIN</h2>
                    <ul className={styles.mainMenu}>
                        <li className={isRootLinkActive('/dashboard')}>
                            <Link href="/dashboard">
                                <div>
                                    <LuHouse />
                                    <span>Dashboard</span>
                                </div>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/admin')}>
                            <Link href="/admin">
                                <div>
                                    <LuShieldCheck />
                                    <span>Admin</span>
                                </div>
                            </Link>
                        </li>
                    </ul>

                    <h2>USERS</h2>
                    <ul className={styles.mainMenu}>
                        <li className={isRootLinkActive('/admin/users')}>
                            <Link href="/admin/users">
                                <div>
                                    <LuUsers />
                                    <span>All Users</span>
                                </div>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/admin/shopify-shops')}>
                            <Link href="/admin/shopify-shops">
                                <div>
                                    <LuStore />
                                    <span>Shopify Shops</span>
                                </div>
                            </Link>
                        </li>
                    </ul>

                    <h2>SUPPORT</h2>
                    <ul className={styles.mainMenu}>
                        <li className={isRootLinkActive('/admin/reported-bugs')}>
                            <Link href="/admin/reported-bugs">
                                <div>
                                    <LuBug />
                                    <span>Bugs Reported</span>
                                </div>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/admin/shopify-reported-bugs')}>
                            <Link href="/admin/shopify-reported-bugs">
                                <div>
                                    <LuStore />
                                    <span>Shopify Reported Bugs</span>
                                </div>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/admin/help-and-support-messages')}>
                            <Link href="/admin/help-and-support-messages">
                                <div>
                                    <LuLifeBuoy />
                                    <span>Help And Support Msgs</span>
                                </div>
                            </Link>
                        </li>
                    </ul>

                    <h2>PROSPECTS</h2>
                    <ul className={styles.mainMenu}>
                        <li className={isRootLinkActive('/admin/contact-email-finder')}>
                            <Link href="/admin/contact-email-finder">
                                <div>
                                    <LuMailSearch />
                                    <span>Contact Email Finder</span>
                                </div>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/admin/contact-email-sender')}>
                            <Link href="/admin/contact-email-sender">
                                <div>
                                    <LuSend />
                                    <span>Email Sender</span>
                                </div>
                            </Link>
                        </li>
                    </ul>
                    
                </div>
                <div className={styles.user}>
                    <LuCircleUser />
                    <div className={styles.userName}>
                        <h3>{ email }</h3>
                    </div>
                </div>
            </div>
        </>
    );
}