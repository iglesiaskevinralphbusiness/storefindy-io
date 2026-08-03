'use client';

import styles from '../sign-in/SignIn.module.scss';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import Image from 'next/image';

export default function SignUpPage() {
    const handleGoogleSignUp = () => {
        signIn('google', { callbackUrl: '/dashboard' });
    };

    return (
        <div className={styles.signIn}>
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
                <Image src="/images/sign-in/map-with-pin.jpg" alt="Sign up right" width={500} height={500} loading="eager" />
            </div>
        </div>
    );
}
