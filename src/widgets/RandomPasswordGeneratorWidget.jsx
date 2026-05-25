import { useState } from 'react';
import PoweredBy from '../components/PoweredBy';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/|~';

function getCharset(complexity) {
	switch (complexity) {
		case 'low':
			return LOWER + UPPER;
		case 'medium':
			return LOWER + UPPER + DIGITS;
		case 'high':
		default:
			return LOWER + UPPER + DIGITS + SYMBOLS;
	}
}

function randomInt(max) {
	if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
		const arr = new Uint32Array(1);
		const limit = Math.floor(0xffffffff / max) * max;
		let x;
		do {
			window.crypto.getRandomValues(arr);
			x = arr[0];
		} while (x >= limit);
		return x % max;
	}
	return Math.floor(Math.random() * max);
}

function generatePassword(length, charset) {
	let out = '';
	for (let i = 0; i < length; i++) {
		out += charset.charAt(randomInt(charset.length));
	}
	return out;
}

export default function RandomPasswordGenerator() {
	const [count, setCount] = useState(1);
	const [length, setLength] = useState(12);
	const [complexity, setComplexity] = useState('high');
	const [passwords, setPasswords] = useState([]);
	const [copiedIdx, setCopiedIdx] = useState(null);

	function handleGenerate() {
		const charset = getCharset(complexity);
		const n = Math.max(1, Math.min(100, Number(count) || 1));
		const len = Math.max(4, Math.min(128, Number(length) || 8));
		const list = [];
		for (let i = 0; i < n; i++) {
			list.push(generatePassword(len, charset));
		}
		setPasswords(list);
		setCopiedIdx(null);
	}

	function handleCopy(text, idx) {
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			navigator.clipboard.writeText(text);
			setCopiedIdx(idx);
			setTimeout(() => setCopiedIdx((current) => (current === idx ? null : current)), 1200);
		}
	}

	function handleCopyAll() {
		if (!passwords.length) return;
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			navigator.clipboard.writeText(passwords.join('\n'));
			setCopiedIdx('all');
			setTimeout(() => setCopiedIdx((current) => (current === 'all' ? null : current)), 1200);
		}
	}

	return (
		<div className="pwd-gen">
			<PoweredBy />
			<div className="controls">
				<div className="field">
					<label className="lbl" htmlFor="pwd-count">Number of passwords</label>
					<input
						id="pwd-count"
						className="num"
						type="number"
						min="1"
						max="100"
						value={count}
						onChange={(e) => setCount(e.target.value)}
					/>
				</div>
				<div className="field">
					<label className="lbl" htmlFor="pwd-length">Password length: <span className="val">{length}</span></label>
					<input
						id="pwd-length"
						className="range"
						type="range"
						min="4"
						max="64"
						value={length}
						onChange={(e) => setLength(Number(e.target.value))}
					/>
				</div>
				<div className="field">
					<label className="lbl" htmlFor="pwd-complexity">Complexity</label>
					<select
						id="pwd-complexity"
						className="sel"
						value={complexity}
						onChange={(e) => setComplexity(e.target.value)}
					>
						<option value="low">Low (letters)</option>
						<option value="medium">Medium (letters + numbers)</option>
						<option value="high">High (letters + numbers + symbols)</option>
					</select>
				</div>
			</div>
			<div className="actions">
				<button type="button" className="generate-btn" onClick={handleGenerate}>
					Generate
				</button>
				{passwords.length > 1 && (
					<button type="button" className="copy-all-btn" onClick={handleCopyAll}>
						{copiedIdx === 'all' ? 'Copied!' : 'Copy all'}
					</button>
				)}
			</div>
			{passwords.length > 0 && (
				<div className="output">
					<label className="lbl">Generated passwords</label>
					<ul className="pwd-list">
						{passwords.map((p, idx) => (
							<li key={idx} className="pwd-item">
								<code className="pwd-text">{p}</code>
								<button
									type="button"
									className="copy-btn"
									onClick={() => handleCopy(p, idx)}
									aria-label="Copy password"
								>
									{copiedIdx === idx ? 'Copied!' : 'Copy'}
								</button>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

export const randomPasswordGeneratorStyles = `
	.powered-by { position: absolute; bottom: 0; right: 0; font-size: 12px; color: #6b7280; }
	.powered-by a { color: #2563eb; text-decoration: none; }
	.pwd-gen { position: relative; max-width: 480px; margin: 0 auto; padding-bottom: 20px; display: flex; flex-direction: column; gap: 16px; }
	.controls { display: flex; flex-direction: column; gap: 22px; }
	.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
	.lbl { font-size: 14px; font-weight: 600; color: #374151; }
	.val { font-weight: 500; color: #2563eb; }
	.num, .sel {
		padding: 10px 12px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #ffffff;
		font-size: 14px;
		color: #111827;
		outline: none;
	}
	.num:focus, .sel:focus { border-color: #2563eb; }
	.range { width: 100%; accent-color: #2563eb; }
	.actions { display: flex; gap: 8px; }
	.generate-btn {
		padding: 8px 18px;
		border: none;
		border-radius: 8px;
		background: #2563eb;
		color: white;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}
	.generate-btn:hover { background: #1d4ed8; }
	.copy-all-btn {
		padding: 8px 14px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #ffffff;
		color: #374151;
		font-size: 14px;
		cursor: pointer;
	}
	.copy-all-btn:hover { background: #f3f4f6; }
	.output { display: flex; flex-direction: column; gap: 8px; padding-top: 22px; }
	.pwd-list {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #ffffff;
		overflow: hidden;
	}
	.pwd-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 12px;
		border-bottom: 1px solid #e5e7eb;
	}
	.pwd-item:last-child { border-bottom: none; }
	.pwd-text {
		flex: 1 1 auto;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 14px;
		color: #111827;
		word-break: break-all;
	}
	.copy-btn {
		flex: 0 0 auto;
		padding: 4px 10px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: #f9fafb;
		color: #374151;
		font-size: 12px;
		cursor: pointer;
	}
	.copy-btn:hover { background: #f3f4f6; }
	@media (max-width: 640px) {
		.controls { grid-template-columns: 1fr; }
	}
`;
