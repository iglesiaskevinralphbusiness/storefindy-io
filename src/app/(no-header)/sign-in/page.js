import styles from './SignIn.module.scss';
import Link from 'next/link';

export default function SignInPage() {
    return (
        <div className={styles.signIn}>
            <div className={styles.colLeft}>
                <div className={styles.content}>
                    <h1>Welcome Back to<br />Storefindy</h1>
                    <hr />
                    <p>Sign in to your account to continue</p>

                    <p>Not a member yet? <Link href="/sign-up">Sign up</Link></p>
                </div>
            </div>
            <div className={styles.colRight}>

            </div>
        </div>
    );
}