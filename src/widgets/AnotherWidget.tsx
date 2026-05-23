type Props = {
	label?: string;
	color?: string;
};

export default function AnotherWidget({ label = 'Click me', color = 'blue' }: Props) {
	return (
		<button type="button" className="btn" style={{ background: color }}>
			{label}
		</button>
	);
}

export const anotherWidgetStyles = `
	:host { display: inline-block; font-family: system-ui, sans-serif; }
	.btn {
		padding: 10px 18px;
		border: none;
		border-radius: 8px;
		color: white;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.btn:hover { opacity: 0.85; }
`;
