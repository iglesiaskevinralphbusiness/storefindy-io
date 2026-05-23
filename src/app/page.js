'use client';
import { useState, useEffect } from 'react';
import styles from './page.module.scss';
import { FaAngleRight } from "react-icons/fa6";
import Link from 'next/link';
import { CATEGORIES, TOOLS } from '@/utils/constant';

export default function Home() {
    const [search, setSearch] = useState('');
    const [filteredTools, setFilteredTools] = useState(TOOLS);

    useEffect(() => {
        setFilteredTools(TOOLS.filter(tool => tool.name.toLowerCase().includes(search.toLowerCase()) || tool.description.toLowerCase().includes(search.toLowerCase())));
    }, [search]);

    return (
        <>
        
            <div className="pt-8 pb-12">
                <div className={styles.search}>
                    <input type="text" placeholder="Search for a tool" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
            </div>

            {
                CATEGORIES.map(category => (
                    <div key={category.id} className="pb-16">
                        <h2>{category.name}</h2>
                        <ul className={styles.tools}>
                            {filteredTools.filter(tool => tool.category === category.id).map(tool => (
                                <li key={tool.id}>
                                    <Link href={`/tools${tool.url}`}>
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
