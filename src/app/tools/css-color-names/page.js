import styles from '../tools.module.scss';
import { FaAngleLeft } from "react-icons/fa6";
import Link from 'next/link';
import Script from 'next/script';
import EmbedSnippet from '../../../components/EmbedSnippet';

export default function CSSColorNamesPage() {
    return (
        <div className={styles.toolpage}>
            <Link href="/" className={styles.back}><FaAngleLeft /></Link>
            <div>
                <div className={styles.title}>
                    <h1>CSS Color Names</h1>
                    <p>Convert color names to their hexadecimal values and vice versa.</p>
                </div>
                
                <div className={styles['tool-container']}>
                    <Script src="/widgets.js" strategy="afterInteractive" />
                    <css-color-names></css-color-names>
                </div>

                <div className={styles.toolDetails}>
                    <div className={styles.detailsCol}>
                        <div>
                            <h2>How to use CSS Color Names</h2>
                            <p>1. Enter the color name of hexadecimal into the input field.</p>
                            <p>2. The table will filter the colors based on the input.</p>
                        </div>

                        <hr />

                        <div>
                            <h2>What is CSS Color Names?</h2>
                            <p>CSS Color Names is a tool that converts color names to their hexadecimal values and vice versa.</p>
                        </div>

                        <hr />

                        <div>
                            <h2>Why use CSS Color Names?</h2>
                            <p>CSS Color Names is a tool that converts color names to their hexadecimal values and vice versa. It is easy to use and can help you convert color names to their hexadecimal values and vice versa.</p>
                        </div>
                    </div>
                    <div className={styles.detailsCol}>
                        <div>
                            <h2>Embed this tool on your website</h2>
                            <EmbedSnippet>
                                <script src="https://localhost:3000/widgets.js" />
                                <css-color-names></css-color-names>
                            </EmbedSnippet>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}