import { useState, useMemo, useRef } from 'react';

function diffArray(a, b) {
	const m = a.length;
	const n = b.length;
	const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
			else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
		}
	}
	const ops = [];
	let i = m;
	let j = n;
	while (i > 0 && j > 0) {
		if (a[i - 1] === b[j - 1]) {
			ops.push({ type: 'equal', a: a[i - 1], b: b[j - 1] });
			i--;
			j--;
		} else if (dp[i - 1][j] >= dp[i][j - 1]) {
			ops.push({ type: 'remove', a: a[i - 1] });
			i--;
		} else {
			ops.push({ type: 'add', b: b[j - 1] });
			j--;
		}
	}
	while (i > 0) {
		ops.push({ type: 'remove', a: a[i - 1] });
		i--;
	}
	while (j > 0) {
		ops.push({ type: 'add', b: b[j - 1] });
		j--;
	}
	return ops.reverse();
}

function pairChanges(ops) {
	const result = [];
	let i = 0;
	while (i < ops.length) {
		if (ops[i].type === 'remove' || ops[i].type === 'add') {
			const removes = [];
			const adds = [];
			while (i < ops.length && (ops[i].type === 'remove' || ops[i].type === 'add')) {
				if (ops[i].type === 'remove') removes.push(ops[i].a);
				else adds.push(ops[i].b);
				i++;
			}
			const maxLen = Math.max(removes.length, adds.length);
			for (let k = 0; k < maxLen; k++) {
				if (k < removes.length && k < adds.length) {
					result.push({ type: 'change', a: removes[k], b: adds[k] });
				} else if (k < removes.length) {
					result.push({ type: 'remove', a: removes[k] });
				} else {
					result.push({ type: 'add', b: adds[k] });
				}
			}
		} else {
			result.push(ops[i]);
			i++;
		}
	}
	return result;
}

function inlineDiff(a, b) {
	const at = Array.from(a);
	const bt = Array.from(b);
	const ops = diffArray(at, bt);
	const segs = [];
	for (const op of ops) {
		const type = op.type;
		const text = type === 'add' ? op.b : op.a;
		if (segs.length && segs[segs.length - 1].type === type) {
			segs[segs.length - 1].text += text;
		} else {
			segs.push({ type, text });
		}
	}
	return segs;
}

export default function TextDiffChecker() {
	const [original, setOriginal] = useState('');
	const [changed, setChanged] = useState('');
	const [result, setResult] = useState(null);
	const origTaRef = useRef(null);
	const origLnRef = useRef(null);
	const changedTaRef = useRef(null);
	const changedLnRef = useRef(null);

	const origLineCount = useMemo(
		() => Math.max(1, original.split('\n').length),
		[original]
	);
	const changedLineCount = useMemo(
		() => Math.max(1, changed.split('\n').length),
		[changed]
	);

	function makeScrollHandler(taRef, lnRef) {
		return () => {
			if (taRef.current && lnRef.current) {
				lnRef.current.scrollTop = taRef.current.scrollTop;
			}
		};
	}

	function handleCompare() {
		const origLines = original.split('\n');
		const changedLines = changed.split('\n');
		const ops = pairChanges(diffArray(origLines, changedLines));

		const leftRows = [];
		const rightRows = [];
		let leftLn = 0;
		let rightLn = 0;

		for (const op of ops) {
			if (op.type === 'equal') {
				leftLn++;
				rightLn++;
				leftRows.push({ ln: leftLn, cls: 'eq', text: op.a });
				rightRows.push({ ln: rightLn, cls: 'eq', text: op.b });
			} else if (op.type === 'remove') {
				leftLn++;
				leftRows.push({ ln: leftLn, cls: 'removed', text: op.a });
				rightRows.push({ ln: '', cls: 'empty', text: '' });
			} else if (op.type === 'add') {
				rightLn++;
				leftRows.push({ ln: '', cls: 'empty', text: '' });
				rightRows.push({ ln: rightLn, cls: 'added', text: op.b });
			} else if (op.type === 'change') {
				leftLn++;
				rightLn++;
				const segs = inlineDiff(op.a, op.b);
				const leftSegs = segs
					.filter((s) => s.type !== 'add')
					.map((s) => ({ kind: s.type === 'remove' ? 'rm' : 'eq', text: s.text }));
				const rightSegs = segs
					.filter((s) => s.type !== 'remove')
					.map((s) => ({ kind: s.type === 'add' ? 'add' : 'eq', text: s.text }));
				leftRows.push({ ln: leftLn, cls: 'removed', segs: leftSegs });
				rightRows.push({ ln: rightLn, cls: 'added', segs: rightSegs });
			}
		}
		setResult({ leftRows, rightRows });
	}

	function renderRow(row, idx, sideClass) {
		const cellContent = row.segs
			? row.segs.map((s, i) => (
					<span
						key={i}
						className={
							s.kind === 'rm'
								? 'inline-rm'
								: s.kind === 'add'
									? 'inline-add'
									: ''
						}
					>
						{s.text}
					</span>
				))
			: row.text === ''
				? ' '
				: row.text;
		return (
			<div key={idx} className={`diff-row ${row.cls}`}>
				<span className="diff-ln">{row.ln === '' ? ' ' : row.ln}</span>
				<span className={`diff-text ${sideClass}`}>{cellContent}</span>
			</div>
		);
	}

	return (
		<div className="diff-checker">
			<div className="powered-by">Powered by: <a href={`process.env.NEXT_PUBLIC_ROOT_URL/?ref=embedtool`} target="_blank" rel="noopener">Toolifier.com</a></div>
			<div className="grid">
				<div className="col">
					<label className="lbl">Original Text</label>
					<div className="ta-wrap">
						<div className="ln-col" ref={origLnRef}>
							{Array.from({ length: origLineCount }, (_, i) => (
								<div key={i} className="ln-num">{i + 1}</div>
							))}
						</div>
						<textarea
							ref={origTaRef}
							className="ta"
							value={original}
							spellCheck={false}
							onChange={(e) => setOriginal(e.target.value)}
							onScroll={makeScrollHandler(origTaRef, origLnRef)}
							placeholder="Paste the original text here..."
						/>
					</div>
				</div>
				<div className="col">
					<label className="lbl">Changed Text</label>
					<div className="ta-wrap">
						<div className="ln-col" ref={changedLnRef}>
							{Array.from({ length: changedLineCount }, (_, i) => (
								<div key={i} className="ln-num">{i + 1}</div>
							))}
						</div>
						<textarea
							ref={changedTaRef}
							className="ta"
							value={changed}
							spellCheck={false}
							onChange={(e) => setChanged(e.target.value)}
							onScroll={makeScrollHandler(changedTaRef, changedLnRef)}
							placeholder="Paste the changed text here..."
						/>
					</div>
				</div>
			</div>
			<div className="actions">
				<button type="button" className="compare-btn" onClick={handleCompare}>
					Compare
				</button>
			</div>
			{result && (
				<div className="grid results">
					<div className="col">
						<label className="lbl">Original</label>
						<div className="diff-view">
							{result.leftRows.map((row, idx) => renderRow(row, idx, 'left'))}
						</div>
					</div>
					<div className="col">
						<label className="lbl">Changed</label>
						<div className="diff-view">
							{result.rightRows.map((row, idx) => renderRow(row, idx, 'right'))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export const textDiffCheckerStyles = `
	.powered-by { position: absolute; bottom: 0; right: 0; font-size: 12px; color: #6b7280; a { color: #2563eb; text-decoration: none; } }
	.diff-checker { position: relative; padding-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
	.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
	.grid.results { margin-top: 32px; }
	.col { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
	.lbl { padding-bottom: 4px; font-size: 15px; font-weight: 600; color: #374151; }
	.ta-wrap {
		display: flex;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #ffffff;
		overflow: hidden;
		height: 240px;
	}
	.ln-col {
		flex: 0 0 auto;
		padding: 8px 8px 8px 10px;
		background: #f3f4f6;
		color: #6b7280;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 13px;
		line-height: 1.5;
		text-align: right;
		user-select: none;
		overflow: hidden;
		border-right: 1px solid #e5e7eb;
		min-width: 36px;
		box-sizing: border-box;
	}
	.ln-num { height: 1.5em; }
	.ta {
		flex: 1 1 auto;
		border: none;
		outline: none;
		resize: none;
		padding: 8px 10px;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 13px;
		line-height: 1.5;
		background: transparent;
		color: inherit;
		white-space: pre;
		overflow: auto;
		min-width: 0;
	}
	.actions { display: flex; }
	.compare-btn {
		padding: 8px 18px;
		border: none;
		border-radius: 8px;
		background: #2563eb;
		color: white;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}
	.compare-btn:hover { background: #1d4ed8; }
	.diff-view {
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #ffffff;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 13px;
		line-height: 1.5;
		overflow: auto;
		max-height: 420px;
	}
	.diff-row {
		display: flex;
		align-items: flex-start;
	}
	.diff-ln {
		flex: 0 0 auto;
		min-width: 36px;
		padding: 0 8px 0 10px;
		background: #f3f4f6;
		color: #6b7280;
		text-align: right;
		border-right: 1px solid #e5e7eb;
		user-select: none;
		box-sizing: border-box;
	}
	.diff-text {
		flex: 1 1 auto;
		padding: 0 8px;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.diff-row.eq { background: #ffffff; }
	.diff-row.changed { background: #ffffff; }
	.diff-row.removed { background: #fee2e2; }
	.diff-row.added { background: #dcfce7; }
	.diff-row.empty { background: #f9fafb; }
	.inline-rm { background: #ef4444; color: #ffffff; border-radius: 2px; padding: 0 1px; }
	.inline-add { background: #16a34a; color: #ffffff; border-radius: 2px; padding: 0 1px; }
`;
