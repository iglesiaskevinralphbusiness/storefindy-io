'use client';
import { useState, useEffect } from 'react';
import styles from './AdminSidebar.module.scss';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaAngleUp } from "react-icons/fa6";
import { LuChevronLeft, LuChevronRight, LuHouse, LuPlus, LuPalette, LuCodeXml, LuList, LuUpload, LuUser, LuBookUser, LuKeyRound, LuBell, LuAppWindow, LuFileQuestion, LuBug, LuBookOpen, LuCircleUser, LuMapPin, LuGlobe } from "react-icons/lu";
import { VscGraphLine } from "react-icons/vsc";
import { IoMapOutline } from "react-icons/io5";
import { HiOutlineSquares2X2 } from "react-icons/hi2";
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
                                    <LuHouse />
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
                                    <LuHouse />
                                    <span>All Users</span>
                                </div>
                            </Link>
                        </li>
                    </ul>

                    <h2>SUPPORT</h2>
                    <ul className={styles.mainMenu}>
                        <li className={isRootLinkActive('/admin/reported-bugs')}>
                            <Link href="/admin/reported-bugs">
                                <div>
                                    <LuHouse />
                                    <span>Bugs Reported</span>
                                </div>
                            </Link>
                        </li>
                        <li className={isRootLinkActive('/admin/help-and-support-messages')}>
                            <Link href="/admin/help-and-support-messages">
                                <div>
                                    <LuHouse />
                                    <span>Help And Support Msgs</span>
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