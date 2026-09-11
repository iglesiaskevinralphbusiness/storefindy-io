'use client';
// Whether this browser can run the AI features, in a form a component can read
// during render.
//
// The probe touches `navigator` and `Worker`, so it can only run on the client —
// but reading it with a lazy `useState` initialiser would render "unsupported"
// on the server and "supported" in the browser, which is a hydration mismatch.
// `useSyncExternalStore` is the sanctioned way to say "this value differs
// between server and client": React renders the server snapshot through
// hydration and swaps in the real one immediately afterwards, with no effect
// and no cascading render.
import { useSyncExternalStore } from 'react';
import { detectAiSupport } from './models';

// Device capability doesn't change while a page is open, so there is nothing to
// subscribe to — but the store contract needs the function.
const subscribe = () => () => {};

// Cached because getSnapshot() must return a stable reference; a fresh object
// each call would make React think the store changed on every render.
let cached = null;
const getSnapshot = () => {
    if (cached === null) cached = detectAiSupport();
    return cached;
};

// `null` means "not known yet". Components render nothing until they have a
// real answer, so an AI panel never flashes in and out during hydration.
const getServerSnapshot = () => null;

/** @returns {{supported: boolean, reason: string}|null} */
export function useAiSupport() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
