import styles from '../tools.module.scss';
import { FaAngleLeft } from "react-icons/fa6";
import Link from 'next/link';

export default function TemplatePage() {
    return (
        <div className={styles.toolpage}>
            <Link href="/" className={styles.back}><FaAngleLeft /></Link>
            <div>
                <div className={styles.title}>
                    <h1>JSON Formatter Online</h1>
                    <p>Format and validate JSON online. Remove unwanted characters and format to make it readable.</p>
                </div>
                
                <div className={styles['tool-container']}>


                </div>

                <hr />

                <div>
                    <h2>How to use JSON Formatter</h2>
                    <p>1. Copy and paste your JSON code into the input field.</p>
                    <p>2. Click the "Format" button.</p>
                    <p>3. The formatted JSON code will be displayed in the output field.</p>
                </div>

                <hr />

                <div>
                    <h2>What is JSON?</h2>
                    <p>JSON is a lightweight data-interchange format. It is easy for humans to read and write. It is easy for machines to parse and generate.</p>
                </div>

                <hr />

                <div>
                    <h2>Why use JSON Formatter?</h2>
                    <p>JSON Formatter is a tool that formats and validates JSON online. It is easy to use and can help you format and validate JSON code.</p>
                </div>
            </div>
        </div>
    );
}