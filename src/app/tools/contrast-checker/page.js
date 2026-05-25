import styles from '../tools.module.scss';
import { FaAngleLeft } from "react-icons/fa6";
import Link from 'next/link';
import Script from 'next/script';
import EmbedSnippet from '../../../components/EmbedSnippet';

export default function ContrastCheckerPage() {
    return (
        <div className={styles.toolpage}>
            <Link href="/" className={styles.back}><FaAngleLeft /></Link>
            <div>
                <div className={styles.title}>
                    <h1>Contrast Checker & Recommender</h1>
                    <p>Check the contrast of your text and background colors to ensure they are accessible.</p>
                </div>
                
                <div className={styles['tool-container']}>
                    <Script src="/widgets.js" strategy="afterInteractive" />
                    <contrast-checker></contrast-checker>
                </div>

                <div className={styles.toolDetails}>
                    <div className={styles.detailsCol}>
                        <div>
                            <h2>How to use Contrast Checker & Recommender</h2>
                            <p>1. Select the text color and background color.</p>
                            <p>2. The contrast ratio and recommendation will be displayed in the output field.</p>
                        </div>

                        <hr />

                        <div>
                            <h2>What is Contrast Checker & Recommender?</h2>
                            <p>Contrast Checker & Recommender is a tool that checks the contrast of your text and background colors to ensure they are accessible.</p>
                        </div>

                        <hr />

                        <div>
                            <h2>Why use Contrast Checker & Recommender?</h2>
                            <p>Contrast Checker & Recommender is a tool that checks the contrast of your text and background colors to ensure they are accessible. It is easy to use and can help you check the contrast of your text and background colors to ensure they are accessible.</p>
                        </div>
                    </div>
                    <div className={styles.detailsCol}>
                        <div>
                            <h2>Embed this tool on your website</h2>
                            <EmbedSnippet>
                                <script src="https://localhost:3000/widgets.js" />
                                <contrast-checker></contrast-checker>
                            </EmbedSnippet>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}