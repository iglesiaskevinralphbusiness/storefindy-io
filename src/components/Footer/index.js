import styles from './Footer.module.scss';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContainer}>
                <div className={styles.footerLeft}>
                    <p>Copyright &copy; 2026 Toolifier.io. All Rights Reserved.</p>
                </div>
                <div className={styles.footerRight}>
                    <ul>
                        <li><Link href="/">Home</Link></li>
                        <li><Link href="/">About Us</Link></li>
                        <li><Link href="/">Contact Us</Link></li>
                        <li><Link href="/">Privacy Policy</Link></li>
                        <li><Link href="/sitemap.xml">Sitemap</Link></li>
                    </ul>
                </div>
            </div>
        </footer>
    );
}