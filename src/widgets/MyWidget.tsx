import { useState } from 'react';

type Props = {
	title?: string;
	theme?: string;
};

export default function MyWidget({ title = 'Hello', theme = 'light' }: Props) {
	const [count, setCount] = useState(0);
	const isDark = theme === 'dark';

	return (
		<div className={`widget ${isDark ? 'dark' : 'light'}`}>
			<h3 className="title">{title}</h3>
			<p className="count">Clicked {count} times</p>
			<button type="button" onClick={() => setCount((c) => c + 1)}>
				Click me
			</button>
		</div>
	);
}

export const myWidgetStyles = `
	:host { display: inline-block; font-family: system-ui, sans-serif; }
	.widget {
		padding: 16px 20px;
		border-radius: 12px;
		border: 1px solid #e5e7eb;
		min-width: 220px;
	}
	.widget.dark {
		background: #111827;
		color: #f9fafb;
		border-color: #374151;
	}
	.widget.light {
		background: #ffffff;
		color: #111827;
	}
	.title { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
	.count { margin: 0 0 12px; font-size: 14px; opacity: 0.8; }
	button {
		padding: 6px 12px;
		border-radius: 6px;
		border: none;
		background: #3b82f6;
		color: white;
		font-size: 14px;
		cursor: pointer;
	}
	button:hover { background: #2563eb; }
`;
