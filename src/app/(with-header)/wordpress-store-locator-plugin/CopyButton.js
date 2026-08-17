'use client';
import { useState } from 'react';
import styles from './SinglePage.module.scss';

export default function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard unavailable (insecure context / denied permission) — leave the label as-is.
        }
    };

    return (
        <button type="button" className={styles.copyBtn} onClick={onCopy}>
            {copied ? 'Copied!' : 'Copy'}
        </button>
    );
}
