import { useMemo, useState } from 'react';
import PoweredBy from '../components/PoweredBy';
import { CSS_NAMED_COLORS } from '../utils/constant/cssNamedColors';

export default function CSSColorNames() {
	const [query, setQuery] = useState('');
	const [copied, setCopied] = useState(null);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return CSS_NAMED_COLORS;
		return CSS_NAMED_COLORS.filter(
			(c) => c.name.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q)
		);
	}, [query]);

	function handleCopy(value) {
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			navigator.clipboard.writeText(value);
			setCopied(value);
			setTimeout(() => setCopied((c) => (c === value ? null : c)), 1200);
		}
	}

	return (
		<div className="css-color-names">
			<PoweredBy />
			<div className="field">
				<label className="lbl" htmlFor="ccn-search">Search by name or hex</label>
				<input
					id="ccn-search"
					type="text"
					className="search"
					value={query}
					spellCheck={false}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="e.g. coral or #FF7F50"
				/>
				<div className="count">
					{filtered.length} of {CSS_NAMED_COLORS.length} colors
				</div>
			</div>
			<div className="table-wrap">
				{filtered.length === 0 ? (
					<div className="empty">No colors match &ldquo;{query}&rdquo;.</div>
				) : (
					<table className="ccn-table">
						<thead>
							<tr>
								<th className="th-name">Name</th>
								<th className="th-hex">Hex</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((c) => (
								<tr key={c.name}>
									<td>
										<button
											type="button"
											className="cell-btn"
											onClick={() => handleCopy(c.name)}
											title="Copy name"
										>
											{copied === c.name ? 'Copied!' : c.name}
										</button>
									</td>
									<td>
										<div className="hex-cell">
											<span
												className="swatch"
												style={{ background: c.hex }}
												aria-hidden="true"
											/>
											<button
												type="button"
												className="cell-btn mono"
												onClick={() => handleCopy(c.hex)}
												title="Copy hex"
											>
												{copied === c.hex ? 'Copied!' : c.hex}
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

export const cssColorNamesStyles = `
	.css-color-names {
		position: relative;
		padding-bottom: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
		color: #111827;
	}
	.field { display: flex; flex-direction: column; gap: 6px; }
	.lbl { font-size: 14px; font-weight: 600; color: #374151; }
	.search {
		padding: 10px 12px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #ffffff;
		font-size: 14px;
		color: #111827;
		outline: none;
	}
	.search:focus {
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
	}
	.count { font-size: 12px; color: #6b7280; }
	.table-wrap {
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #ffffff;
		overflow: auto;
	}
	.ccn-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	.ccn-table thead th {
		position: sticky;
		top: 0;
		background: #f9fafb;
		text-align: left;
		font-weight: 600;
		color: #374151;
		padding: 10px 12px;
		border-bottom: 1px solid #e5e7eb;
		z-index: 1;
	}
	.th-name { width: 55%; }
	.th-hex { width: 45%; }
	.ccn-table tbody tr { border-bottom: 1px solid #f3f4f6; }
	.ccn-table tbody tr:last-child { border-bottom: none; }
	.ccn-table tbody tr:hover { background: #f9fafb; }
	.ccn-table td { padding: 8px 12px; vertical-align: middle; }
	.hex-cell { display: flex; align-items: center; gap: 10px; }
	.swatch {
		display: inline-block;
		width: 22px;
		height: 22px;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		flex: 0 0 auto;
	}
	.cell-btn {
		background: transparent;
		border: none;
		padding: 2px 4px;
		margin: -2px -4px;
		border-radius: 4px;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		text-transform: capitalize;
	}
	.cell-btn:hover { background: #eef2ff; color: #2563eb; }
	.cell-btn.mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		text-transform: uppercase;
	}
	.empty {
		padding: 24px;
		text-align: center;
		color: #6b7280;
		font-size: 14px;
	}
`;
