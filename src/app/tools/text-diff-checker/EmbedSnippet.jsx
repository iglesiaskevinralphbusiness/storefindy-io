'use client';

import { useState, Children, isValidElement } from 'react';
import styles from '../tools.module.scss';

function serializeElement(element) {
	if (typeof element === 'string') return element;
	if (!isValidElement(element)) return '';

	const tag = element.type;
	if (typeof tag !== 'string') return '';

	const { children, ...attrs } = element.props || {};
	const attrStr = Object.entries(attrs)
		.map(([k, v]) => ` ${k}="${String(v)}"`)
		.join('');

	const isCustomElement = tag.includes('-');
	const childArray = Children.toArray(children);
	const hasChildren = childArray.length > 0;

	if (!hasChildren && !isCustomElement) {
		return `<${tag}${attrStr} />`;
	}

	const innerStr = childArray.map(serializeElement).join('');
	return `<${tag}${attrStr}>${innerStr}</${tag}>`;
}

function highlightElement(element, key) {
	if (typeof element === 'string') return <span key={key}>{element}</span>;
	if (!isValidElement(element)) return null;

	const tag = element.type;
	if (typeof tag !== 'string') return null;

	const { children, ...attrs } = element.props || {};
	const isCustomElement = tag.includes('-');
	const childArray = Children.toArray(children);
	const hasChildren = childArray.length > 0;

	const attrNodes = Object.entries(attrs).flatMap(([k, v], i) => [
		<span key={`sp-${i}`}> </span>,
		<span key={`attr-${i}`} className={styles.cAttr}>{k}</span>,
		<span key={`eq-${i}`} className={styles.cPunct}>=</span>,
		<span key={`val-${i}`} className={styles.cStr}>&quot;{String(v)}&quot;</span>,
	]);

	if (!hasChildren && !isCustomElement) {
		return (
			<span key={key}>
				<span className={styles.cPunct}>&lt;</span>
				<span className={styles.cTag}>{tag}</span>
				{attrNodes}
				<span> </span>
				<span className={styles.cPunct}>/&gt;</span>
			</span>
		);
	}

	return (
		<span key={key}>
			<span className={styles.cPunct}>&lt;</span>
			<span className={styles.cTag}>{tag}</span>
			{attrNodes}
			<span className={styles.cPunct}>&gt;</span>
			{childArray.map((c, i) => highlightElement(c, i))}
			<span className={styles.cPunct}>&lt;/</span>
			<span className={styles.cTag}>{tag}</span>
			<span className={styles.cPunct}>&gt;</span>
		</span>
	);
}

export default function EmbedSnippet({ children }) {
	const childArray = Children.toArray(children);
	const code = childArray.map(serializeElement).join('\n');

	const [copied, setCopied] = useState(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
		} catch {
			const ta = document.createElement('textarea');
			ta.value = code;
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
					{childArray.map((c, i) => (
						<span key={i}>
							{highlightElement(c, i)}
							{i < childArray.length - 1 && '\n'}
						</span>
					))}
				</code>
			</pre>
		</div>
	);
}
