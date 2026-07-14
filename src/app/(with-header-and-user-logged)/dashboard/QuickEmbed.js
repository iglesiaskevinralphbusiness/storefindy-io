'use client';
import { useState } from 'react';
import styles from './Dashboard.module.scss';
import { TbCopy, TbCheck } from 'react-icons/tb';

// Quick embed snippet — reuses the same widget markup as the Embed Locator page
// (see locators/embed/embed-client.js) so the dashboard shows the real snippet.
export default function QuickEmbed({ locatorName, locatorId }) {
    const [copied, setCopied] = useState(false);

    const display = `<locator-widget locator="${locatorId}"></locator-widget>`;
    const full = `${display}\n<script src="https://storefindy.com/widgets.js"></script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(full).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={styles.quickEmbed}>
            <div className={styles.snippetLabel}>Quick embed — {locatorName}</div>
            <div className={styles.snippetWrap}>
                <div className={styles.snippetCode}>{display}</div>
                <button type="button" className={styles.snippetCopy} onClick={handleCopy}>
                    {copied ? <><TbCheck /> Copied!</> : <><TbCopy /> Copy</>}
                </button>
            </div>
        </div>
    );
}
