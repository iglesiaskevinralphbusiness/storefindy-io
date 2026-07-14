import { NextResponse } from 'next/server';

// Base domain the app is served from. Anything in front of it is treated as a
// tenant sub-domain, e.g. `demo` in `demo.storefindy.com`.
// Override in the environment when running under a different domain.
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'storefindy.com';

// Sub-domains that are part of the main app, not tenant locator pages.
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api']);

/**
 * Resolve the tenant sub-domain from a request host, or null when the request
 * is for the root domain itself.
 *
 * Handles production (`demo.storefindy.com`) and local dev
 * (`demo.localhost:3000`).
 */
function getSubdomain(host) {
	// Drop the port, e.g. `demo.localhost:3000` -> `demo.localhost`.
	const hostname = host.split(':')[0];

	// Local development: <sub>.localhost
	if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
		const parts = hostname.split('.');
		return parts.length > 1 ? parts[0] : null;
	}

	// Production: <sub>.<ROOT_DOMAIN>
	if (hostname === ROOT_DOMAIN || !hostname.endsWith(`.${ROOT_DOMAIN}`)) {
		return null;
	}

	const sub = hostname.slice(0, -(ROOT_DOMAIN.length + 1)); // strip ".ROOT_DOMAIN"
	// Ignore nested labels (only a single-level sub-domain is a tenant).
	return sub.includes('.') ? null : sub;
}

export function middleware(request) {
	const host = request.headers.get('host') || '';
	const subdomain = getSubdomain(host);

	if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
		return NextResponse.next();
	}

	const url = request.nextUrl.clone();

	// Avoid rewrite loops if the sub-domain path is requested directly.
	if (url.pathname.startsWith('/sub-domain/')) {
		return NextResponse.next();
	}

	// Serve the tenant's locator page for the whole sub-domain.
	const suffix = url.pathname === '/' ? '' : url.pathname;
	url.pathname = `/sub-domain/${subdomain}${suffix}`;

	return NextResponse.rewrite(url);
}

export const config = {
	// Run on all paths except Next internals, the API, and static files.
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
