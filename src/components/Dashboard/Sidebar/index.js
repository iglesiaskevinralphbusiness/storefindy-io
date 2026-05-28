'use client';
import { useState } from 'react';
import styles from './DashboardSidebar.module.scss';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaAngleUp } from "react-icons/fa6";
import { LuHouse, LuPlus, LuPalette, LuCodeXml, LuList, LuUpload, LuUser, LuBookUser, LuKeyRound, LuBell, LuAppWindow, LuFileQuestion, LuBug, LuBookOpen, LuCircleUser } from "react-icons/lu";
import { VscGraphLine } from "react-icons/vsc";
import { IoMapOutline } from "react-icons/io5";
import { HiOutlineSquares2X2 } from "react-icons/hi2";
import { useSelector } from 'react-redux';

export default function Sidebar() {
    const { email } = useSelector(state => state.user);
    const [isLocatorMenuOpen, setIsLocatorMenuOpen] = useState(false);
    const [isLocationsMenuOpen, setIsLocationsMenuOpen] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    
    const isRootLinkActive = (value) => {
        return usePathname() === value ? styles.active : '';
    }

    return (
        <div className={styles.sidebar}>
            <div className={styles.menus}>
                <h2>MAIN</h2>
                <ul className={styles.mainMenu}>
                    <li className={isRootLinkActive('/dashboard')}>
                        <Link href="/dashboard">
                            <LuHouse />
                            Dashboard
                        </Link>
                    </li>
                    <li className={isRootLinkActive('/dashboard/analytics')}>
                        <Link href="/dashboard/analytics">
                            <VscGraphLine />
                            Analytics
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
                            aria-expanded={isLocatorMenuOpen}
                        >
                            <div>
                                <IoMapOutline />
                                My Locators
                            </div>
                            <FaAngleUp />
                        </div>
                    </li>
                </ul>
                <ul className={`${styles.subMenu} ${isLocatorMenuOpen ? styles.open : ''}`}>
                    <li className={isRootLinkActive('/dashboard/locators')}>
                        <Link href="/dashboard/locators">
                            <HiOutlineSquares2X2 />
                            All Locators
                        </Link>
                    </li>
                    <li className={isRootLinkActive('/dashboard/locators/create')}>
                        <Link href="/dashboard/locators/create">
                            <LuPlus />
                            Create Locator
                        </Link>
                    </li>
                    <li className={isRootLinkActive('/dashboard/locators/customize')}>
                        <Link href="/dashboard/locators/customize">
                            <LuPalette />
                            Customize Locator
                        </Link>
                    </li>
                    <li className={isRootLinkActive('/dashboard/locators/embed')}>
                        <Link href="/dashboard/locators/embed">
                            <LuCodeXml />
                            Embed Locator
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
                            aria-expanded={isLocationsMenuOpen}
                        >
                            <div>
                                <IoMapOutline />
                                Locations
                            </div>
                            <FaAngleUp />
                        </div>
                    </li>
                </ul>
                <ul className={`${styles.subMenu} ${isLocationsMenuOpen ? styles.open : ''}`}>
                    <li className={isRootLinkActive('/dashboard/locations')}>
                        <Link href="/dashboard/locations">
                            <LuList />
                            All Locations
                        </Link>
                    </li>
                    <li className={isRootLinkActive('/dashboard/locations/add-location')}>
                        <Link href="/dashboard/locations/add-location">
                            <LuPlus />
                            Add Location
                        </Link>
                    </li>
                    <li className={isRootLinkActive('/dashboard/locations/import-csv')}>
                        <Link href="/dashboard/locations/import-csv">
                            <LuUpload />
                            Import CSV
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
                            aria-expanded={isAccountMenuOpen}
                        >
                            <div>
                                <LuUser />
                                Account
                            </div>
                            <FaAngleUp />
                        </div>
                    </li>
                </ul>
                <ul className={`${styles.subMenu} ${isAccountMenuOpen ? styles.open : ''}`}>
                    <li className={isRootLinkActive('/dashboard/profile')}>
                        <Link href="/dashboard/profile">
                            <LuBookUser />
                            Profile
                        </Link>
                    </li>
                    <li className={isRootLinkActive('/dashboard/api-access')}>
                        <Link href="/dashboard/api-access">
                            <LuKeyRound />
                            API Access
                        </Link>
                    </li>
                    <li className={isRootLinkActive('/dashboard/billing')}>
                        <Link href="/dashboard/billing">
                            <LuAppWindow />
                            Billing
                        </Link>
                    </li>
                    <li className={isRootLinkActive('/dashboard/notifications')}>
                        <Link href="/dashboard/notifications">
                            <LuBell />
                            Notifications
                        </Link>
                    </li>
                </ul>
                <h2>SUPPORT</h2>
                <ul className={styles.mainMenu}>
                    <li className={isRootLinkActive('/dashboard/documentation')}>
                        <Link href="/dashboard/documentation">
                            <LuBookOpen />
                            Documentation
                        </Link>
                    </li>
                    <li className={isRootLinkActive('/dashboard/help-and-support')}>
                        <Link href="/dashboard/help-and-support">
                            <LuFileQuestion />
                            Help and Support
                        </Link>
                    </li>
                    <li className={isRootLinkActive('/dashboard/report-bug')}>
                        <Link href="/dashboard/report-bug">
                            <LuBug />
                            Report Bug
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
    );
}