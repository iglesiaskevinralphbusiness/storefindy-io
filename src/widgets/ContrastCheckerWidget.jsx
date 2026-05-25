import { useEffect, useMemo, useState } from 'react';
import PoweredBy from '../components/PoweredBy';

function hexToRgb(hex) {
	let h = hex.replace('#', '');
	if (h.length === 3) h = h.split('').map((c) => c + c).join('');
	const int = parseInt(h, 16);
	return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }) {
	const toHex = (v) => v.toString(16).padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function srgbToLinear(v) {
	v = v / 255;
	return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb) {
	const R = srgbToLinear(rgb.r);
	const G = srgbToLinear(rgb.g);
	const B = srgbToLinear(rgb.b);
	return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(fgHex, bgHex) {
	const L1 = relativeLuminance(hexToRgb(fgHex));
	const L2 = relativeLuminance(hexToRgb(bgHex));
	const lighter = Math.max(L1, L2);
	const darker = Math.min(L1, L2);
	return +(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function rgbToHsl({ r, g, b }) {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h, s;
	const l = (max + min) / 2;
	if (max === min) {
		h = s = 0;
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}
	return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb({ h, s, l }) {
	h /= 360; s /= 100; l /= 100;
	if (s === 0) {
		const v = Math.round(l * 255);
		return { r: v, g: v, b: v };
	}
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	const hue2rgb = (p, q, t) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	return {
		r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
		g: Math.round(hue2rgb(p, q, h) * 255),
		b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
	};
}

function hexFromHsl(hsl) {
	return rgbToHex(hslToRgb(hsl));
}

const WCAG = { AA: 4.5, AA_LARGE: 3.0, AAA: 7.0, AAA_LARGE: 4.5 };

function suggestForegroundForContrast(fgHex, bgHex, targetContrast, precision = 0.01) {
	const originalHsl = rgbToHsl(hexToRgb(fgHex));
	const current = contrastRatio(fgHex, bgHex);
	if (current >= targetContrast) {
		return { success: true, colorHex: fgHex.toUpperCase(), contrast: current, direction: 'none' };
	}
	const testLightness = (L) => {
		const hex = hexFromHsl({ h: originalHsl.h, s: originalHsl.s, l: L });
		return { hex, contrast: contrastRatio(hex, bgHex), l: L };
	};
	const origL = originalHsl.l;
	const search = (low, high) => {
		let best = null;
		while ((high - low) > precision) {
			const mid = (low + high) / 2;
			const r = testLightness(mid);
			if (r.contrast >= targetContrast) {
				best = r;
				if (mid > origL) high = mid;
				else low = mid;
			} else {
				if (mid > origL) low = mid;
				else high = mid;
			}
		}
		return best;
	};
	const darker = search(0, origL);
	const lighter = search(origL, 100);
	const candidates = [];
	if (darker) candidates.push({ ...darker, direction: 'darker', delta: Math.abs(origL - darker.l) });
	if (lighter) candidates.push({ ...lighter, direction: 'lighter', delta: Math.abs(origL - lighter.l) });
	if (!candidates.length) return { success: false, contrast: current };
	candidates.sort((a, b) => a.delta - b.delta);
	const chosen = candidates[0];
	return { success: true, colorHex: chosen.hex.toUpperCase(), contrast: chosen.contrast, direction: chosen.direction };
}

function suggestColorAdjustments(fgHex, bgHex, level, largeText) {
	const target = level === 'AAA' ? (largeText ? WCAG.AAA_LARGE : WCAG.AAA) : (largeText ? WCAG.AA_LARGE : WCAG.AA);
	const current = contrastRatio(fgHex, bgHex);
	return {
		currentContrast: current,
		targetContrast: target,
		passes: current >= target,
		foregroundSuggestion: suggestForegroundForContrast(fgHex, bgHex, target),
		backgroundSuggestion: suggestForegroundForContrast(bgHex, fgHex, target),
	};
}

const LEVELS = [
	{ key: 'AA_NORMAL', wcag: 'AA', size: 'Normal', level: 'AA', largeText: false, target: '4.5:1' },
	{ key: 'AA_LARGE', wcag: 'AA', size: 'Large', level: 'AA', largeText: true, target: '3.0:1' },
	{ key: 'AAA_NORMAL', wcag: 'AAA', size: 'Normal', level: 'AAA', largeText: false, target: '7.0:1' },
	{ key: 'AAA_LARGE', wcag: 'AAA', size: 'Large', level: 'AAA', largeText: true, target: '4.5:1' },
];

function normalizeHexInput(value) {
	let v = value.trim().replace(/^#/, '').toUpperCase();
	v = v.replace(/[^0-9A-F]/g, '');
	return '#' + v.slice(0, 6);
}

function isValidHex(value) {
	return /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(value);
}

function expandHex(value) {
	let v = value.replace('#', '');
	if (v.length === 3) v = v.split('').map((c) => c + c).join('');
	return '#' + v.toUpperCase();
}

function ColorField({ id, label, value, onChange }) {
	const [draft, setDraft] = useState(value);
	const valid = isValidHex(value);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	function commitDraft() {
		const normalized = normalizeHexInput(draft);
		if (isValidHex(normalized)) {
			onChange(expandHex(normalized));
			setDraft(expandHex(normalized));
		} else {
			setDraft(value);
		}
	}

	function handleSwatchChange(e) {
		const next = e.target.value.toUpperCase();
		onChange(next);
		setDraft(next);
	}

	function handleHexChange(e) {
		setDraft(e.target.value);
	}

	const safeSwatchValue = valid ? expandHex(value) : '#000000';

	return (
		<div className="color-field">
			<label className="lbl" htmlFor={`${id}-hex`}>{label}</label>
			<div className="color-row">
				<label className="swatch" style={{ background: safeSwatchValue }} aria-label={`${label} color picker`}>
					<input
						type="color"
						className="color-native"
						value={safeSwatchValue}
						onChange={handleSwatchChange}
					/>
				</label>
				<input
					id={`${id}-hex`}
					type="text"
					className="hex-input"
					value={draft}
					maxLength={7}
					spellCheck={false}
					onChange={handleHexChange}
					onBlur={commitDraft}
					onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
				/>
			</div>
		</div>
	);
}

function ResultCard({ level, fg, bg, data, onApplyFg, onApplyBg, copied, onCopy }) {
	const passClass = data.passes ? 'pass' : 'fail';
	const sampleStyle = level.largeText
		? { fontSize: '18px', fontWeight: 700 }
		: { fontSize: '14px', fontWeight: 400 };
	return (
		<div className={`result-card ${passClass}`}>
			<div className="result-head">
				<div>
					<div className="result-title">WCAG {level.wcag} · {level.size} Text</div>
					<div className="result-sub">Target {level.target}</div>
				</div>
				<span className={`badge ${passClass}`}>{data.passes ? 'Pass' : 'Fail'}</span>
			</div>
			<div className="sample" style={{ background: bg, color: fg, ...sampleStyle }}>
				Sample Text
			</div>
			<div className="ratios">
				<span><strong>{data.currentContrast}</strong> : 1</span>
			</div>
			{!data.passes && (
				<div className="suggestions">
					<div className="sugg-label">Suggested fixes</div>
					<div className="sugg-row">
						{data.foregroundSuggestion?.success && (
							<SuggestionChip
								label="Text"
								background={bg}
								foreground={data.foregroundSuggestion.colorHex}
								onApply={() => onApplyFg(data.foregroundSuggestion.colorHex)}
								onCopy={() => onCopy(data.foregroundSuggestion.colorHex)}
								copied={copied === data.foregroundSuggestion.colorHex}
								large={level.largeText}
							/>
						)}
						{data.backgroundSuggestion?.success && (
							<SuggestionChip
								label="Background"
								background={data.backgroundSuggestion.colorHex}
								foreground={fg}
								onApply={() => onApplyBg(data.backgroundSuggestion.colorHex)}
								onCopy={() => onCopy(data.backgroundSuggestion.colorHex)}
								copied={copied === data.backgroundSuggestion.colorHex}
								large={level.largeText}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function SuggestionChip({ label, background, foreground, onApply, onCopy, copied, large }) {
	const target = label === 'Text' ? foreground : background;
	return (
		<div className="sugg-chip">
			<button
				type="button"
				className={`sugg-preview ${large ? 'large' : ''}`}
				style={{ background, color: foreground }}
				onClick={onApply}
				title={`Apply ${label.toLowerCase()} ${target}`}
			>
				Sample Text
			</button>
			<div className="sugg-meta">
				<span className="sugg-name">{label}</span>
				<button type="button" className="sugg-hex" onClick={onCopy} title="Copy hex">
					{copied ? 'Copied!' : target}
				</button>
			</div>
		</div>
	);
}

export default function ContrastChecker() {
	const [fg, setFg] = useState('#111827');
	const [bg, setBg] = useState('#FFFFFF');
	const [copied, setCopied] = useState(null);

	const fgValid = isValidHex(fg);
	const bgValid = isValidHex(bg);
	const ready = fgValid && bgValid;

	const results = useMemo(() => {
		if (!ready) return null;
		const out = {};
		for (const lvl of LEVELS) {
			out[lvl.key] = suggestColorAdjustments(fg, bg, lvl.level, lvl.largeText);
		}
		return out;
	}, [fg, bg, ready]);

	const overall = useMemo(() => (ready ? contrastRatio(fg, bg) : null), [fg, bg, ready]);

	function handleSwap() {
		setFg(bg);
		setBg(fg);
	}

	function handleCopy(hex) {
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			navigator.clipboard.writeText(hex);
			setCopied(hex);
			setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1500);
		}
	}

	const overallTone = overall == null ? '' : overall >= 7 ? 'aaa' : overall >= 4.5 ? 'aa' : overall >= 3 ? 'aa-large' : 'fail';
	const overallLabel = overall == null
		? ''
		: overall >= 7
			? 'Excellent — passes AAA'
			: overall >= 4.5
				? 'Good — passes AA'
				: overall >= 3
					? 'Borderline — large text only'
					: 'Poor — fails WCAG';

	return (
		<div className="contrast-checker">
			<PoweredBy />
			<div className="picker-row">
				<ColorField id="fg" label="Text color" value={fg} onChange={setFg} />
				<button type="button" className="swap-btn" onClick={handleSwap} aria-label="Swap colors" title="Swap colors">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M7 16V4M7 4L3 8M7 4l4 4" />
						<path d="M17 8v12M17 20l4-4M17 20l-4-4" />
					</svg>
				</button>
				<ColorField id="bg" label="Background color" value={bg} onChange={setBg} />
			</div>

			{ready && (
				<div className={`overall ${overallTone}`}>
					<div className="overall-preview" style={{ background: bg, color: fg }}>
						<span className="overall-sample">The quick brown fox</span>
						<span className="overall-sample-lg">Large heading</span>
					</div>
					<div className="overall-meta">
						<div className="overall-ratio"><strong>{overall}</strong><span>: 1</span></div>
						<div className="overall-label">{overallLabel}</div>
					</div>
				</div>
			)}

			{ready && results && (
				<div className="results-grid">
					{LEVELS.map((lvl) => (
						<ResultCard
							key={lvl.key}
							level={lvl}
							fg={fg}
							bg={bg}
							data={results[lvl.key]}
							onApplyFg={(hex) => setFg(hex)}
							onApplyBg={(hex) => setBg(hex)}
							onCopy={handleCopy}
							copied={copied}
						/>
					))}
				</div>
			)}

			{!ready && (
				<div className="hint">Enter a valid hex color in both fields to see the contrast results.</div>
			)}
		</div>
	);
}

export const contrastCheckerStyles = `
	.contrast-checker {
		position: relative;
		padding-bottom: 28px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
		color: #111827;
	}
	.lbl { font-size: 14px; font-weight: 600; color: #374151; }
	.picker-row {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: end;
		gap: 12px;
	}
	.color-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
	.color-row {
		display: flex;
		align-items: stretch;
		gap: 8px;
		border: 1px solid #d1d5db;
		border-radius: 10px;
		background: #ffffff;
		padding: 4px;
		transition: border-color 0.15s, box-shadow 0.15s;
	}
	.color-row:focus-within {
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
	}
	.swatch {
		position: relative;
		width: 44px;
		height: 36px;
		border-radius: 6px;
		cursor: pointer;
		border: 1px solid #e5e7eb;
		flex: 0 0 auto;
		box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05);
		overflow: hidden;
	}
	.color-native {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		border: none;
		padding: 0;
	}
	.hex-input {
		flex: 1 1 auto;
		min-width: 0;
		border: none;
		outline: none;
		padding: 6px 8px;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 14px;
		color: #111827;
		background: transparent;
		text-transform: uppercase;
	}
	.swap-btn {
		align-self: center;
		margin-top: 22px;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid #d1d5db;
		background: #ffffff;
		color: #374151;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s, transform 0.15s;
	}
	.swap-btn:hover { background: #f3f4f6; transform: rotate(180deg); }

	.overall {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 16px;
		align-items: center;
		padding: 16px 18px;
		border-radius: 12px;
		border: 1px solid #e5e7eb;
		background: #f9fafb;
	}
	.overall.aaa { border-color: #16a34a; background: #f0fdf4; }
	.overall.aa { border-color: #2563eb; background: #eff6ff; }
	.overall.aa-large { border-color: #f59e0b; background: #fffbeb; }
	.overall.fail { border-color: #ef4444; background: #fef2f2; }
	.overall-preview {
		padding: 14px 16px;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		border: 1px solid rgba(0,0,0,0.06);
	}
	.overall-sample { font-size: 14px; }
	.overall-sample-lg { font-size: 20px; font-weight: 700; }
	.overall-meta { text-align: right; }
	.overall-ratio strong { font-size: 30px; font-weight: 700; }
	.overall-ratio span { font-size: 16px; color: #6b7280; margin-left: 4px; }
	.overall-label { font-size: 13px; font-weight: 600; color: #374151; margin-top: 2px; }

	.results-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
	}
	.result-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		border-radius: 10px;
		border: 1px solid #e5e7eb;
		background: #ffffff;
	}
	.result-card.pass { border-color: #bbf7d0; background: #f7fef9; }
	.result-card.fail { border-color: #fecaca; background: #fffafa; }
	.result-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
	.result-title { font-size: 14px; font-weight: 600; color: #111827; }
	.result-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
	.badge {
		padding: 3px 10px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.badge.pass { background: #16a34a; color: #ffffff; }
	.badge.fail { background: #ef4444; color: #ffffff; }
	.sample {
		padding: 10px 12px;
		border-radius: 6px;
		border: 1px solid rgba(0,0,0,0.06);
	}
	.ratios { display: flex; gap: 10px; align-items: baseline; font-size: 13px; color: #374151; }
	.ratios strong { font-size: 16px; }
	.muted { color: #9ca3af; font-size: 12px; }

	.suggestions {
		margin-top: 4px;
		padding-top: 10px;
		border-top: 1px dashed #e5e7eb;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.sugg-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
	.sugg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.sugg-chip { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
	.sugg-preview {
		border: 1px solid rgba(0,0,0,0.08);
		border-radius: 6px;
		padding: 8px 10px;
		font-size: 13px;
		cursor: pointer;
		text-align: left;
		transition: transform 0.1s, box-shadow 0.15s;
	}
	.sugg-preview.large { font-size: 16px; font-weight: 700; }
	.sugg-preview:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.08); transform: translateY(-1px); }
	.sugg-meta { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
	.sugg-name { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
	.sugg-hex {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 11px;
		color: #374151;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 2px 6px;
		cursor: pointer;
	}
	.sugg-hex:hover { background: #e5e7eb; }

	.hint {
		padding: 14px;
		border: 1px dashed #d1d5db;
		border-radius: 10px;
		font-size: 13px;
		color: #6b7280;
		text-align: center;
	}

	@media (max-width: 640px) {
		.picker-row { grid-template-columns: 1fr; }
		.swap-btn { margin: 0 auto; transform: rotate(90deg); }
		.swap-btn:hover { transform: rotate(270deg); }
		.results-grid { grid-template-columns: 1fr; }
		.overall { grid-template-columns: 1fr; }
		.overall-meta { text-align: left; }
		.sugg-row { grid-template-columns: 1fr; }
	}
`;
