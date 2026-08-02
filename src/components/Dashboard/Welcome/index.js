'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
    TbMapPin,
    TbShieldCheck,
    TbCheck,
    TbRocket,
    TbLoader2
} from 'react-icons/tb';
import styles from './Welcome.module.scss';
import Modal from '@/components/Modal';
import { postProfileWelcomeAccepted } from '@/actions/profile';

const STEPS = [
    {
        title: 'Create your first locator',
        desc: 'Give it a name, pick your map style, and set your brand colors — takes about 2 minutes.',
    },
    {
        title: 'Add your store locations',
        desc: 'Add them one by one or bulk upload via CSV. Free plan supports up to 25 locations.',
    },
    {
        title: 'Embed on your website',
        desc: 'Copy one line of code and paste it into your website. Works on WordPress, Shopify, Wix, or plain HTML.',
    },
];

export default function Welcome({ isAgreed = false }) {
    const [agreed, setAgreed] = useState(isAgreed ? false : true);
    const [isLoading, setIsLoading] = useState(false);

    const handleClickContinue = async () => {
        setIsLoading(true);
        const result = await postProfileWelcomeAccepted();
        if (result.status === 'success') {
            setAgreed(false);
        } else {
            toast.error(result.message);
        }
        setAgreed(false);
    }

    return (
        <Modal
            isOpen={agreed}
            onClose={() => setAgreed(false)}
            title="Welcome to Storefindy!"
            showHeader={false}
        >
            <div className={styles.wrap}>
                {/* TOP */}
                <div className={styles.top}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}><TbMapPin /></div>
                        <span className={styles.logoText}>Storefindy</span>
                        <span className={styles.logoBadge}>Free plan</span>
                    </div>
                    <div className={styles.headline}>Welcome to Storefindy!</div>
                    <div className={styles.sub}>
                        Your free store locator is ready to set up. Let&apos;s get your first store
                        on the map in under 10 minutes.
                    </div>
                </div>

                {/* BODY */}
                <div className={styles.body}>
                    <div className={styles.stepsLabel}>Get started in 3 steps</div>
                    <div className={styles.steps}>
                        {STEPS.map((step, i) => (
                            <div className={styles.step} key={step.title}>
                                <div className={styles.stepNum}>{i + 1}</div>
                                <div>
                                    <div className={styles.stepTitle}>{step.title}</div>
                                    <div className={styles.stepDesc}>{step.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.divider} />

                    <div className={styles.policyBox}>
                        <div className={styles.policyTitle}>
                            <TbShieldCheck /> Before you continue
                        </div>
                        <div className={styles.policyText}>
                            By using Storefindy you agree to our{' '}
                            <Link href="/terms-of-service" target="_blank">Terms of Service</Link> and{' '}
                            <Link href="/privacy-policy" target="_blank">Privacy Policy</Link>. We never sell your
                            data or your customers&apos; data. Your store location data is yours —
                            export it anytime.
                        </div>
                    </div>

                    <div
                        className={styles.checkboxRow}
                        onClick={() => {
                            // setAgreed((v) => !v)
                        }}
                        role="checkbox"
                        aria-checked={agreed}
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                // setAgreed((v) => !v);
                            }
                        }}
                    >
                        <div className={`${styles.cbBox} ${agreed ? styles.checked : ''}`}>
                            <TbCheck />
                        </div>
                        <div className={styles.cbLabel}>
                            I agree to the{' '}
                            <Link href="/terms-of-service" onClick={(e) => e.stopPropagation()} target="_blank">
                                Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy-policy" onClick={(e) => e.stopPropagation()} target="_blank">
                                Privacy Policy
                            </Link>
                        </div>
                    </div>

                    <button
                        type="button"
                        className={styles.btnStart}
                        disabled={isLoading}
                        onClick={() => handleClickContinue()}
                    >
                        {isLoading ? <TbLoader2 className={styles.loading} /> : <TbRocket />}
                        Continue to my dashboard
                    </button>

                    <div className={styles.footer}>
                        Questions? <a href="mailto:hello@storefindy.com">hello@storefindy.com</a> ·{' '}
                        <Link href="/dashboard/documentation">Read the docs</Link>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
