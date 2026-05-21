import styles from './page.module.scss';
import { IoCodeSlash } from "react-icons/io5";
import { FaAngleRight } from "react-icons/fa6";
import Link from 'next/link';

export default function Home() {
    return (
        <>
            <div className="pb-12">
                <div className={styles.search}>
                    <input type="text" placeholder="Search for a tool" />
                </div>
            </div>

            <div className="pb-16">
                <h2>Code & Text Formatters</h2>
                <ul className={styles.tools}>
                    {Array.from({ length: 10 }, (_, i) => (
                        <li key={i}>
                            <Link href="/tools/template">
                                <span className={styles.icon}>
                                    <IoCodeSlash />
                                </span>
                                <span className={styles.text}>
                                    <span className={styles.title}>JSON beautifier</span>
                                    <span className={styles.description}>Format JSON data for easy reading</span>
                                </span>
                                <span className={styles.arrow}><FaAngleRight /></span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="pb-16">
                <h2>Text Tools</h2>
            </div>

            <div className="pb-16">
                <h2>Color Tools</h2>
            </div>

            <div className="pb-16">
                <h2>Generators</h2>
            </div>

            <div className="pb-16">
                <h2>Everyday Utilities</h2>
            </div>

            <div className="pb-16">
                <h2>Converters</h2>
            </div>

            <div className="pb-16">
                <h2>Web Scraping Tools</h2>
            </div>

        </>
    );
}
