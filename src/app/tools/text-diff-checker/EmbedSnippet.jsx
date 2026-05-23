'use client';

import { useState } from 'react';
import styles from '../tools.module.scss';

const CODE = `<Script src="/widgets.js" strategy="afterInteractive" />
<text-diff-checker></text-diff-checker>`;

export default function EmbedSnippet() {
	const [copied, setCopied] = useState(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(CODE);
		} catch {
			const ta = document.createElement('textarea');
			ta.value = CODE;
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
		}
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	function onKeyDown(e) {
		const isCopyShortcut =
			(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c';
		const isEnterOrSpace = e.key === 'Enter' || e.key === ' ';
		if (isCopyShortcut || (isEnterOrSpace && e.target.dataset.copyTrigger)) {
			e.preventDefault();
			copy();
		}
	}

	return (
		<div
			className={styles.codeWrap}
			tabIndex={0}
			onKeyDown={onKeyDown}
			aria-label="Embed code snippet"
		>
			<button
				type="button"
				className={styles.copyBtn}
				onClick={copy}
				data-copy-trigger="true"
				aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
			>
				{copied ? 'Copied!' : 'Copy'}
			</button>
			<pre className={styles.codeBlock}>
				<code>
					<span className={styles.cPunct}>&lt;</span>
					<span className={styles.cTag}>Script</span>
					<span> </span>
					<span className={styles.cAttr}>src</span>
					<span className={styles.cPunct}>=</span>
					<span className={styles.cStr}>&quot;/widgets.js&quot;</span>
					<span> </span>
					<span className={styles.cAttr}>strategy</span>
					<span className={styles.cPunct}>=</span>
					<span className={styles.cStr}>&quot;afterInteractive&quot;</span>
					<span> </span>
					<span className={styles.cPunct}>/&gt;</span>
					{'\n'}
					<span className={styles.cPunct}>&lt;</span>
					<span className={styles.cTag}>text-diff-checker</span>
					<span className={styles.cPunct}>&gt;</span>
					<span className={styles.cPunct}>&lt;/</span>
					<span className={styles.cTag}>text-diff-checker</span>
					<span className={styles.cPunct}>&gt;</span>
				</code>
			</pre>
		</div>
	);
}
