import styles from '../tools.module.scss';
import { FaAngleLeft } from "react-icons/fa6";
import Link from 'next/link';
import Script from 'next/script';
import EmbedSnippet from './EmbedSnippet';

export default function TextDiffCheckerPage() {
    return (
        <div className={styles.toolpage}>
            <Link href="/" className={styles.back}><FaAngleLeft /></Link>
            <div>
                <div className={styles.title}>
                    <h1>Text Diff Checker</h1>
                    <p>Compare two texts and find the differences between them.</p>
                </div>
                
                <div className={styles['tool-container']}>
                    <Script src="/widgets.js" strategy="afterInteractive" />
                    <text-diff-checker></text-diff-checker>
                </div>

                <div className={styles.toolDetails}>
                    <div className={styles.detailsCol}>
                        <div>
                            <h2>How to use Text Diff Checker</h2>
                            <p>1. Copy and paste your original text into the original text input field.</p>
                            <p>2. Copy and paste your changed text into the changed text input field.</p>
                            <p>3. Click the "Compare" button.</p>
                            <p>4. The differences between the original text and the changed text will be displayed in the output field.</p>
                        </div>

                        <hr />

                        <div>
                            <h2>What is Text Diff Checker?</h2>
                            <p>Text Diff Checker is a tool that compares two texts and finds the differences between them.</p>
                        </div>

                        <hr />

                        <div>
                            <h2>Why use Text Diff Checker?</h2>
                            <p>Text Diff Checker is a tool that compares two texts and finds the differences between them. It is easy to use and can help you find the differences between two texts.</p>
                        </div>
                    </div>
                    <div className={styles.detailsCol}>
                        <div>
                            <h2>Embed this tool on your website</h2>
                            <EmbedSnippet>
                                <script src="https://localhost:3000/widgets.js" />
                                <text-diff-checker></text-diff-checker>
                            </EmbedSnippet>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}