import styles from './Header.module.scss';
import Link from "next/link";
import Image from "next/image";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { TbMoon } from "react-icons/tb";
import { FaRegHeart } from "react-icons/fa6";



export default function Header() {
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
                        <li>
                            <Link href="/"><HiOutlineInformationCircle /></Link>
                            <span>About Us</span>
                        </li>
                        <li>
                            <button><TbMoon /></button>
                            <span>Dark Mode</span>
                        </li>
                        <li className={styles.buyMeACoffee}>
                            <Link href="#">Buy me a coffee <FaRegHeart /></Link>
                            <span>Support Us</span>
                        </li>
                    </ul>
                </div>
            </div>
        </header>
    );
}