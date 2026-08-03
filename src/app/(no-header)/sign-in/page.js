'use client';

import styles from './SignIn.module.scss';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import Image from 'next/image';

export default function SignInPage() {
    const handleGoogleSignIn = () => {
        signIn('google', { callbackUrl: '/dashboard' });
    };

    const handleGithubSignIn = () => {
        signIn('github', { callbackUrl: '/dashboard' });
    };

    return (
        <div className={styles.signIn}>
            <div className={styles.colLeft}>
                <div className={styles.content}>
                    <h1>Welcome Back to<br />Storefindy</h1>
                    <hr />
                    <p>Sign in to your account to continue</p>

                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className={styles.googleBtn}
                    >
                        <FcGoogle size={20} />
                        <span>Sign in with Google</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleGithubSignIn}
                        className={styles.githubBtn}
                    >
                        <FaGithub size={20} />
                        <span>Sign in with GitHub</span>
                    </button>

                    <p>Not a member yet? <Link href="/sign-up">Sign up</Link></p>
                </div>
            </div>
            <div className={styles.colRight}>
                <Image src="/images/sign-in/people-with-phone.jpg" alt="Sign in right" width={500} height={500} loading="eager" />
            </div>
        </div>
    );
}
