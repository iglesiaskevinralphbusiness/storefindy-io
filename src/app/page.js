import styles from './page.module.scss';
import { FaAngleRight } from "react-icons/fa6";
import Link from 'next/link';
import { CATEGORIES, TOOLS } from '@/utils/constant';

export default function Home() {
    return (
        <>
        
            <div className="pb-12">
                <div className={styles.search}>
                    <input type="text" placeholder="Search for a tool" />
                </div>
            </div>

            {
                CATEGORIES.map(category => (
                    <div key={category.id} className="pb-16">
                        <h2>{category.name}</h2>
                        <ul className={styles.tools}>
                            {TOOLS.filter(tool => tool.category === category.id).map(tool => (
                                <li key={tool.id}>
                                    <Link href="/tools/template">
                                        <span className={styles.icon}>
                                            {tool.icon}
                                        </span>
                                        <span className={styles.text}>
                                            <span className={styles.title}>{tool.name}</span>
                                            <span className={styles.description}>{tool.description}</span>
                                        </span>
                                        <span className={styles.arrow}><FaAngleRight /></span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            }

        </>
    );
}
