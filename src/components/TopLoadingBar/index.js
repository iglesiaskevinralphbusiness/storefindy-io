'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import styles from './TopLoadingBar.module.scss';

/**
 * A thin loading bar pinned to the top of the page. It appears whenever a
 * navigation starts (link click, router.push, browser back/forward) and
 * completes automatically once the new route has finished loading.
 *
 * Works without any external dependency by:
 *  - intercepting internal <a> clicks and patching history.pushState/replaceState
 *    (which router.push / router.replace call under the hood) to know when a
 *    navigation *starts*,
 *  - watching pathname + searchParams to know when it has *finished*.
 */
export default function TopLoadingBar() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [progress, setProgress] = useState(0);
	const [visible, setVisible] = useState(false);

	const trickleRef = useRef(null);
	const doneTimeoutRef = useRef(null);
	const runningRef = useRef(false);

	// Complete the bar (jump to 100%, then hide).
	const finish = () => {
		if (!runningRef.current) return; // nothing in progress
		runningRef.current = false;

		if (trickleRef.current) {
			clearInterval(trickleRef.current);
			trickleRef.current = null;
		}
		setProgress(100);
		doneTimeoutRef.current = setTimeout(() => {
			setVisible(false);
			setProgress(0);
		}, 250);
	};

	useEffect(() => {
		// Start the bar and trickle it toward ~90% while the page loads.
		const start = () => {
			if (doneTimeoutRef.current) {
				clearTimeout(doneTimeoutRef.current);
				doneTimeoutRef.current = null;
			}
			if (runningRef.current) return; // already running
			runningRef.current = true;

			setVisible(true);
			setProgress(10);
			trickleRef.current = setInterval(() => {
				setProgress((prev) => {
					if (prev >= 90) return prev;
					// Ease the increments so it slows down as it nears the end.
					const increment = (90 - prev) * 0.1;
					return Math.min(prev + increment, 90);
				});
			}, 200);
		};

		// 1. Intercept clicks on internal links.
		const onClick = (event) => {
			if (event.defaultPrevented) return;
			if (event.button !== 0) return; // only left click
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

			const anchor = event.target.closest?.('a');
			if (!anchor) return;

			const href = anchor.getAttribute('href');
			if (!href || href.startsWith('#')) return;
			if (anchor.target && anchor.target !== '_self') return;
			if (anchor.hasAttribute('download')) return;

			let url;
			try {
				url = new URL(anchor.href, window.location.href);
			} catch {
				return;
			}

			if (url.origin !== window.location.origin) return; // external
			// Same URL (only a hash change) — no real navigation.
			if (url.pathname === window.location.pathname && url.search === window.location.search) {
				return;
			}

			start();
		};

		// 2. Patch history methods so router.push / router.replace also trigger it.
		const originalPushState = window.history.pushState;
		const originalReplaceState = window.history.replaceState;

		window.history.pushState = function (...args) {
			start();
			return originalPushState.apply(this, args);
		};
		window.history.replaceState = function (...args) {
			start();
			return originalReplaceState.apply(this, args);
		};

		// 3. Browser back / forward.
		const onPopState = () => start();

		document.addEventListener('click', onClick);
		window.addEventListener('popstate', onPopState);

		return () => {
			document.removeEventListener('click', onClick);
			window.removeEventListener('popstate', onPopState);
			window.history.pushState = originalPushState;
			window.history.replaceState = originalReplaceState;
		};
	}, []);

	// When the route actually changes, the new page has loaded — finish the bar.
	// Defer to a microtask so we don't call setState synchronously in the effect.
	useEffect(() => {
		const id = setTimeout(finish, 0);
		return () => {
			clearTimeout(id);
			if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
		};
	}, [pathname, searchParams]);

	if (!visible) return null;

	return (
		<div
			className={styles.bar}
			style={{
				transform: `scaleX(${progress / 100})`,
				opacity: progress >= 100 ? 0 : 1,
			}}
			role="progressbar"
			aria-hidden="true"
		/>
	);
}
