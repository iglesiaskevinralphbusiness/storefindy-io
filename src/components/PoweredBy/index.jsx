export default function PoweredBy() {
    if(process.env.NEXT_PUBLIC_ROOT_URL === 'http://localhost:3000') {
        return null;
    }
    return (
        <div className="powered-by">Powered by: <a href={`${process.env.NEXT_PUBLIC_ROOT_URL}/?ref=embedtool`} target="_blank" rel="noopener">Toolifier.com</a></div>
    );
}

export const poweredByCheckerStyles = `
	.powered-by { position: absolute; bottom: 0; right: 0; font-size: 12px; color: #6b7280; a { color: #2563eb; text-decoration: none; } }
`;