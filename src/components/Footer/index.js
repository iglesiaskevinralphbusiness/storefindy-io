import styles from './Footer.module.scss';
import Link from 'next/link';
import { TbMapPin } from 'react-icons/tb';

const productLinks = [
    { label: 'Features', href: '/#features' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Live Demo', href: 'https://demo.storefindy.com' },
    { label: 'Create Locator', href: '/dashboard' },
];

const companyLinks = [
    { label: 'Home', href: '/' },
    { label: 'About Us', href: '/about-us' },
    { label: 'Testimonials', href: '/#testimonials' },
    { label: 'Contact Us', href: '/contact-us' },
];

const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-service' },
    { label: 'Sitemap', href: '/sitemap.xml' },
];

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContainer}>
                <div className={styles.footerTop}>
                    <div className={styles.footerBrand}>
                        <Link href="/" className={styles.brandLogo}>
                            <span className={styles.brandMark}><TbMapPin aria-hidden="true" /></span>
                            Storefindy
                        </Link>
                        <p className={styles.brandTagline}>
                            A beautiful, fast store locator widget for your website.
                            Live in minutes — no developer, zero complexity.
                        </p>
                    </div>

                    <div className={styles.footerLinks}>
                        <div className={styles.linkColumn}>
                            <h3>Product</h3>
                            <ul>
                                {productLinks.map(({ label, href }) => (
                                    <li key={label}><Link href={href}>{label}</Link></li>
                                ))}
                            </ul>
                        </div>
                        <div className={styles.linkColumn}>
                            <h3>Company</h3>
                            <ul>
                                {companyLinks.map(({ label, href }) => (
                                    <li key={label}><Link href={href}>{label}</Link></li>
                                ))}
                            </ul>
                        </div>
                        <div className={styles.linkColumn}>
                            <h3>Legal</h3>
                            <ul>
                                {legalLinks.map(({ label, href }) => (
                                    <li key={label}><Link href={href}>{label}</Link></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={styles.footerBottom}>
                    <p>&copy; 2026 Storefindy. All rights reserved.</p>
                    <p className={styles.madeWith}>Built for small businesses everywhere.</p>
                </div>
            </div>
        </footer>
    );
}
