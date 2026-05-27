'use client';

import styles from './SignUp.module.scss';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';

export default function SignUpPage() {
    const handleGoogleSignUp = () => {
        signIn('google', { callbackUrl: '/dashboard' });
    };

    return (
        <div className={styles.signUp}>
            <div className={styles.colLeft}>
                <div className={styles.content}>
                    <h1>Join<br />Storefindy</h1>
                    <hr />
                    <p>Create your account in seconds with Google</p>

                    <button
                        type="button"
                        onClick={handleGoogleSignUp}
                        className={styles.googleBtn}
                    >
                        <FcGoogle size={20} />
                        <span>Sign up with Google</span>
                    </button>

                    <p>Already a member? <Link href="/sign-in">Sign in</Link></p>
                </div>
            </div>
            <div className={styles.colRight}>

            </div>
        </div>
    );
}
