import { useState, useMemo } from 'react';
import PoweredBy from '../components/PoweredBy';

const LOWER_SIZE = 26;
const UPPER_SIZE = 26;
const DIGIT_SIZE = 10;
const SYMBOL_SIZE = 32;
const GUESSES_PER_SECOND = 1e10;

const LEVELS = [
	{ name: 'Weak', min: 0, color: '#ef4444' },
	{ name: 'Medium', min: 36, color: '#f59e0b' },
	{ name: 'Strong', min: 60, color: '#eab308' },
	{ name: 'Very Strong', min: 80, color: '#84cc16' },
	{ name: 'Excellent', min: 100, color: '#22c55e' },
	{ name: 'Perfect', min: 120, color: '#10b981' },
	{ name: 'Superb', min: 140, color: '#14b8a6' },
	{ name: 'Ultra', min: 160, color: '#2563eb' },
];

function charsetSize(pwd) {
	let size = 0;
	if (/[a-z]/.test(pwd)) size += LOWER_SIZE;
	if (/[A-Z]/.test(pwd)) size += UPPER_SIZE;
	if (/[0-9]/.test(pwd)) size += DIGIT_SIZE;
	if (/[^A-Za-z0-9]/.test(pwd)) size += SYMBOL_SIZE;
	return size;
}

function entropyBits(pwd) {
	const size = charsetSize(pwd);
	if (!size || !pwd.length) return 0;
	return pwd.length * Math.log2(size);
}

function levelFor(entropy) {
	let match = LEVELS[0];
	for (const lvl of LEVELS) {
		if (entropy >= lvl.min) match = lvl;
	}
	return match;
}

function formatDuration(seconds) {
	if (!isFinite(seconds) || seconds <= 0) return 'instant';
	if (seconds < 1) return 'instant';
	const units = [
		{ label: 'year', secs: 60 * 60 * 24 * 365 },
		{ label: 'day', secs: 60 * 60 * 24 },
		{ label: 'hour', secs: 60 * 60 },
		{ label: 'minute', secs: 60 },
		{ label: 'second', secs: 1 },
	];
	if (seconds >= units[0].secs * 1000) {
		const years = seconds / units[0].secs;
		if (years >= 1e15) return `${years.toExponential(2)} years`;
		if (years >= 1e6) return `${Math.round(years).toLocaleString()} years`;
		return `${Math.round(years).toLocaleString()} years`;
	}
	for (const u of units) {
		if (seconds >= u.secs) {
			const n = Math.floor(seconds / u.secs);
			return `${n} ${u.label}${n === 1 ? '' : 's'}`;
		}
	}
	return 'instant';
}

function crackSeconds(pwd) {
	const size = charsetSize(pwd);
	if (!size || !pwd.length) return 0;
	const combos = Math.pow(size, pwd.length);
	return combos / 2 / GUESSES_PER_SECOND;
}

export default function PasswordStrengthMeter() {
	const [password, setPassword] = useState('');
	const [visible, setVisible] = useState(false);

	const stats = useMemo(() => {
		const length = password.length;
		const size = charsetSize(password);
		const entropy = entropyBits(password);
		const level = levelFor(entropy);
		const seconds = crackSeconds(password);
		const maxEntropy = LEVELS[LEVELS.length - 1].min;
		const pct = Math.max(4, Math.min(100, (entropy / maxEntropy) * 100));
		return { length, size, entropy, level, seconds, pct };
	}, [password]);

	function handleReset() {
		setPassword('');
		setVisible(false);
	}

	const hasInput = password.length > 0;

	return (
		<div className="psm">
			<PoweredBy />
			<label className="lbl" htmlFor="psm-input">Password</label>
			<div className="input-wrap">
				<input
					id="psm-input"
					className="input"
					type={visible ? 'text' : 'password'}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Type a password to check..."
					autoComplete="off"
					spellCheck={false}
				/>
			</div>
			{hasInput && (
				<div className="input-actions">
					<button
						type="button"
						className="icon-btn"
						onClick={() => setVisible((v) => !v)}
						aria-label={visible ? 'Hide password' : 'Show password'}
						title={visible ? 'Hide password' : 'Show password'}
					>
						{visible ? (
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
								<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-5.94" />
								<path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-3.17 4.19" />
								<path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
								<line x1="1" y1="1" x2="23" y2="23" />
							</svg>
						) : (
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
						)}
					</button>
					<button
						type="button"
						className="icon-btn"
						onClick={handleReset}
						aria-label="Reset"
						title="Reset"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
			)}
			<div className="output">
				<div className="meter">
					<div
						className="meter-fill"
						style={{ width: hasInput ? `${stats.pct}%` : '0%', background: hasInput ? stats.level.color : 'transparent' }}
					/>
				</div>
				<div className="level-row">
					<span className="level-label">Strength level:</span>
					<span className="level-value" style={{ color: hasInput ? stats.level.color : undefined }}>
						{hasInput ? stats.level.name : '-'}
					</span>
				</div>
				<dl className="stats">
					<div className="stat">
						<dt>Duration to crack this password with brute force</dt>
						<dd>{hasInput ? formatDuration(stats.seconds) : '-'}</dd>
					</div>
					<div className="stat">
						<dt>Password length</dt>
						<dd>{hasInput ? stats.length : '-'}</dd>
					</div>
					<div className="stat">
						<dt>Entropy</dt>
						<dd>{hasInput ? `${stats.entropy.toFixed(2)} bits` : '-'}</dd>
					</div>
					<div className="stat">
						<dt>Character set size</dt>
						<dd>{hasInput ? stats.size : '-'}</dd>
					</div>
				</dl>
			</div>
		</div>
	);
}

export const passwordStrengthMeterStyles = `
	.psm { position: relative; max-width: 480px; margin: 0 auto; padding-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
	.lbl { font-size: 14px; font-weight: 600; color: #374151; }
	.input-wrap { display: flex; }
	.input {
		flex: 1 1 auto;
		padding: 10px 12px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #ffffff;
		font-size: 14px;
		color: #111827;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		outline: none;
	}
	.input:focus { border-color: #2563eb; }
	.input-actions { display: flex; gap: 2px; position: absolute; right: 3px; top: 29px; }
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #f9fafb;
		color: #374151;
		cursor: pointer;
	}
	.icon-btn:hover { background: #f3f4f6; color: #111827; }
	.output { display: flex; flex-direction: column; gap: 24px; padding-top: 25px; }
	.meter {
		width: 100%;
		height: 8px;
		background: #e5e7eb;
		border-radius: 999px;
		overflow: hidden;
	}
	.meter-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 0.2s ease, background 0.2s ease;
	}
	.level-row { display: flex; gap: 8px; align-items: baseline; }
	.level-label { font-size: 15px; color: #6b7280; }
	.level-value { font-size: 15px; font-weight: 700; }
	.stats {
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px 16px;
	}
	.stat { display: flex; flex-direction: column; gap: 4px; margin: 0; }
	.stat dt { font-size: 15px; color: #6b7280; }
	.stat dd { margin: 0; font-size: 14px; font-weight: 600; color: #111827; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
	@media (max-width: 480px) {
		.stats { grid-template-columns: 1fr; }
	}
`;
