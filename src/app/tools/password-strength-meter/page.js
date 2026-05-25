import styles from '../tools.module.scss';
import { FaAngleLeft } from "react-icons/fa6";
import Link from 'next/link';
import Script from 'next/script';
import EmbedSnippet from '../../../components/EmbedSnippet';

export default function PasswordStrengthMeterPage() {
    return (
        <div className={styles.toolpage}>
            <Link href="/" className={styles.back}><FaAngleLeft /></Link>
            <div>
                <div className={styles.title}>
                    <h1>Password Strength Meter</h1>
                    <p>Check the strength of your password.</p>
                </div>
                
                <div className={styles['tool-container']}>
                    <Script src="/widgets.js" strategy="afterInteractive" />
                    <password-strength-meter></password-strength-meter>
                </div>

                <div className={styles.toolDetails}>
                    <div className={styles.detailsCol}>
                        <div>
                            <h2>How to use Password Strength Meter</h2>
                            <p>1. Type your password into the input field.</p>
                            <p>2. A button with a eye icon will appear under password input field. Click it to toggle the visibility of the password.</p>
                            <p>3. Upon typing, the strength of your password will be displayed in the output field in real-time.</p>
                            <p>4. To reset the tool, click the "X" button under the input field.</p>
                            <br />
                            <p>Below are the results indicators:</p>
                            <ul>
                                <li>Duration to crack this password with brute force: The estimated duration to crack the password with brute force.</li>
                                <li>Password length: The length of the password.</li>
                                <li>Entropy: The entropy of the password.</li>
                                <li>Character set size: The size of the character set used in the password.</li>
                                <li>Strength level: The strength level of the password.</li>
                            </ul>
                            <br />
                            <p>Below are the list of strength levels:</p>
                            <ul>
                                <li>Weak: The password is easy to guess.</li>
                                <li>Medium: The password is somewhat difficult to guess.</li>
                                <li>Strong: The password is very difficult to guess.</li>
                                <li>Very Strong: The password is extremely difficult to guess.</li>
                                <li>Excellent: The password is virtually impossible to guess.</li>
                                <li>Perfect: The password is absolutely impossible to guess.</li>
                                <li>Superb: The password is absolutely impossible to guess.</li>
                                <li>Ultra: The password is absolutely impossible to guess.</li>
                                <li>Ultra: The password is absolutely impossible to guess.</li>
                            </ul>
                        </div>

                        <hr />

                        <div>
                            <h2>What is Password Strength Meter?</h2>
                            <p>Password Strength Meter is a tool that checks the strength of your password.</p>
                        </div>

                        <hr />

                        <div>
                            <h2>Why use Password Strength Meter?</h2>
                            <p>Password Strength Meter is a tool that checks the strength of your password. It is easy to use and can help you check the strength of your password.</p>
                        </div>
                    </div>
                    <div className={styles.detailsCol}>
                        <div>
                            <h2>Embed this tool on your website</h2>
                            <EmbedSnippet>
                                <script src="https://localhost:3000/widgets.js" />
                                <password-strength-meter></password-strength-meter>
                            </EmbedSnippet>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}