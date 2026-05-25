import styles from '../tools.module.scss';
import { FaAngleLeft } from "react-icons/fa6";
import Link from 'next/link';
import Script from 'next/script';
import EmbedSnippet from '../../../components/EmbedSnippet';

export default function RandomPasswordGeneratorPage() {
    return (
        <div className={styles.toolpage}>
            <Link href="/" className={styles.back}><FaAngleLeft /></Link>
            <div>
                <div className={styles.title}>
                    <h1>Random Password Generator</h1>
                    <p>Generate a random password with customizable options.</p>
                </div>
                
                <div className={styles['tool-container']}>
                    <Script src="/widgets.js" strategy="afterInteractive" />
                    <random-password-generator></random-password-generator>
                </div>

                <div className={styles.toolDetails}>
                    <div className={styles.detailsCol}>
                        <div>
                            <h2>How to use Random Password Generator</h2>
                            <p>1. Type how many passwords you want to generate.</p>
                            <p>2. Select the length of the password.</p>
                            <p>3. Select the complexity of the password.</p>
                            <p>3. Click the "Generate" button.</p>
                            <p>4. The random passwords will be displayed in the output field.</p>
                        </div>

                        <hr />

                        <div>
                            <h2>What is Random Password Generator?</h2>
                            <p>Random Password Generator is a tool that generates a random password with customizable options.</p>
                        </div>

                        <hr />

                        <div>
                            <h2>Why use Random Password Generator?</h2>
                            <p>Random Password Generator is a tool that generates a random password with customizable options. It is easy to use and can help you generate a random password with customizable options.</p>
                        </div>
                    </div>
                    <div className={styles.detailsCol}>
                        <div>
                            <h2>Embed this tool on your website</h2>
                            <EmbedSnippet>
                                <script src="https://localhost:3000/widgets.js" />
                                <random-password-generator></random-password-generator>
                            </EmbedSnippet>
                        </div>
                        <hr />
                        <div>
                            <h2>You may also like</h2>
                            <ul>
                                <li><Link href="/tools/password-strength-meter">Password Strength Meter</Link> - Check the strength of your password.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}