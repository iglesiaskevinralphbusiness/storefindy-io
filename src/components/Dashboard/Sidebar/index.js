'use client';
import { useState } from 'react';
import styles from './DashboardSidebar.module.scss';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaAngleUp } from "react-icons/fa6";
import { LuChevronLeft, LuChevronRight, LuHouse, LuPlus, LuPalette, LuCodeXml, LuList, LuUpload, LuUser, LuBookUser, LuKeyRound, LuBell, LuAppWindow, LuFileQuestion, LuBug, LuBookOpen, LuCircleUser, LuMapPin, LuGlobe } from "react-icons/lu";
import { VscGraphLine } from "react-icons/vsc";
import { IoMapOutline } from "react-icons/io5";
import { HiOutlineSquares2X2 } from "react-icons/hi2";
import { useSelector } from 'react-redux';

export default function Sidebar() {
    const [isMinimized, setIsMinimized] = useState(false);
    const { email } = useSelector(state => state.user);

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
                        <li className={isRootLinkActive('/dashboard/analytics')}>
                            <Link href="/dashboard/analytics">
                                <div>
                                    <VscGraphLine />
                                    <span>Analytics</span>
                                </div>
                                <span className={styles.badge}>New</span>
                            </Link>
                        </li>
                    </ul>
                    <h2>LOCATOR</h2>
                    <ul className={styles.mainMenu}>
                        <li>
                            <div
                                className={`${styles.toggle} ${!isLocatorMenuOpen ? styles.toggleClosed : ''}`}
                                onClick={() => setIsLocatorMenuOpen(!isLocatorMenuOpen)}
                                role="button"
                                aria-expanded={isLocatorMenuOpen || isSubLinkActive(['/dashboard/locators', '/dashboard/locators/create', '/dashboard/locators/customize', '/dashboard/locators/embed'])}
                            >
                                <div>
                                    <IoMapOutline />
                                    <span>My Locators</span>
                                </div>
                                <FaAngleUp />
                            </div>
                        </li>
                    </ul>
                    <ul className={`${styles.subMenu} ${isLocatorMenuOpen ? styles.open : ''}`}>
                        <li className={isRootLinkActive('/dashboard/locators')}>
                            <Link href="/dashboard/locators">
                                <HiOutlineSquares2X2 />
                                <span>All Locators</span>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/dashboard/locators/create')}>
                            <Link href="/dashboard/locators/create">
                                <LuPlus />
                                <span>Create Locator</span>
                            </Link>
                        </li>
                        <li className={isRootLinkParamsActive('/dashboard/locators/customize')}>
                            <Link href="/dashboard/locators/customize">
                                <LuPalette />
                                <span>Customize Locator</span>
                            </Link>
                        </li>
                        <li className={isRootLinkParamsActive('/dashboard/locators/embed')}>
                            <Link href="/dashboard/locators/embed">
                                <LuCodeXml />
                                <span>Embed Locator</span>
                            </Link>
                        </li>
                        <li className={isRootLinkParamsActive('/dashboard/locators/subdomains')}>
                            <Link href="/dashboard/locators/subdomains">
                                <LuGlobe />
                                <span>Custom Subdomains</span>
                            </Link>
                        </li>
                    </ul>
                    <h2>LOCATIONS</h2>
                    <ul className={styles.mainMenu}>
                        <li>
                            <div
                                className={`${styles.toggle} ${!isLocationsMenuOpen ? styles.toggleClosed : ''}`}
                                onClick={() => setIsLocationsMenuOpen(!isLocationsMenuOpen)}
                                role="button"
                                aria-expanded={isLocationsMenuOpen || isSubLinkActive(['/dashboard/locations', '/dashboard/locations/add-location', '/dashboard/locations/import-csv'])}
                            >
                                <div>
                                    <LuMapPin />
                                    <span>Locations</span>
                                </div>
                                <FaAngleUp />
                            </div>
                        </li>
                    </ul>
                    <ul className={`${styles.subMenu} ${isLocationsMenuOpen ? styles.open : ''}`}>
                        <li className={isRootLinkActive('/dashboard/locations')}>
                            <Link href="/dashboard/locations">
                                <LuList />
                                <span>All Locations</span>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/dashboard/locations/add-location')}>
                            <Link href="/dashboard/locations/add-location">
                                <LuPlus />
                                <span>Add Location</span>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/dashboard/locations/import-csv')}>
                            <Link href="/dashboard/locations/import-csv">
                                <LuUpload />
                                <span>Import CSV</span>
                            </Link>
                        </li>
                    </ul>
                    <h2>ACCOUNT</h2>
                    <ul className={styles.mainMenu}>
                        <li>
                            <div
                                className={`${styles.toggle} ${!isAccountMenuOpen ? styles.toggleClosed : ''}`}
                                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                                role="button"
                                aria-expanded={isAccountMenuOpen || isSubLinkActive(['/dashboard/profile', '/dashboard/api-access', '/dashboard/billing', '/dashboard/notifications'])}
                            >
                                <div>
                                    <LuUser />
                                    <span>Account</span>
                                </div>
                                <FaAngleUp />
                            </div>
                        </li>
                    </ul>
                    <ul className={`${styles.subMenu} ${isAccountMenuOpen ? styles.open : ''}`}>
                        <li className={isRootLinkActive('/dashboard/profile')}>
                            <Link href="/dashboard/profile">
                                <LuBookUser />
                                <span>Profile</span>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/dashboard/api-access')}>
                            <Link href="/dashboard/api-access">
                                <LuKeyRound />
                                <span>API Access</span>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/dashboard/billing')}>
                            <Link href="/dashboard/billing">
                                <LuAppWindow />
                                <span>Billing</span>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/dashboard/notifications')}>
                            <Link href="/dashboard/notifications">
                                <LuBell />
                                <span>Notifications</span>
                            </Link>
                        </li>
                    </ul>
                    <h2>SUPPORT</h2>
                    <ul className={styles.mainMenu}>
                        <li className={isRootLinkActive('/dashboard/documentation')}>
                            <Link href="/dashboard/documentation">
                                <div>
                                    <LuBookOpen />
                                    <span>Documentation</span>
                                </div>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/dashboard/help-and-support')}>
                            <Link href="/dashboard/help-and-support">
                                <div>
                                    <LuFileQuestion />
                                    <span>Help and Support</span>
                                </div>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/dashboard/report-bug')}>
                            <Link href="/dashboard/report-bug">
                                <div>
                                    <LuBug />
                                    <span>Report Bug</span>
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