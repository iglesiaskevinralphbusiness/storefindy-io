'use client';
import { useEffect, useRef, useState } from 'react';
import Highlighter from 'react-highlight-words';

// Address autocomplete for the locator search box. Suggestions come from Photon
// (https://photon.komoot.io) — a free, no-API-key, OpenStreetMap-based geocoder
// that, unlike Nominatim, is purpose-built for as-you-type autocomplete (no
// hard 1 req/sec cap). It's queried directly with fetch so we can cancel
// in-flight requests (AbortController) and cache results, which keeps the
// dropdown fast and reliable. Works identically in the Next.js and esbuild
// widget bundles.
//
// Each suggestion is condensed to "city, state, postal, country", the typed
// text is highlighted inside it, at most 5 are shown, and clicking one fires
// `onSelect` with the exact coordinates so the page searches immediately.

const PHOTON_URL = 'https://photon.komoot.io/api/';
const MAX_SUGGESTIONS = 5;
const DEBOUNCE_MS = 150;
const MIN_QUERY_LENGTH = 2;

// Cache query -> condensed suggestions so re-typing/editing never re-hits the
// network. Module-scoped so it persists across re-renders and remounts.
const cache = new Map();

// Build a concise "city, state, postal, country" label from a Photon feature's
// properties, dropping whatever parts are missing and avoiding duplicates
// (e.g. when the result's name already is the state).
function formatSuggestion(props) {
    const primary = props.name || props.city || '';
    const parts = [];
    if (primary) parts.push(primary);
    if (props.state && props.state !== primary) parts.push(props.state);
    if (props.postcode && props.postcode !== primary) parts.push(props.postcode);
    if (props.country && props.country !== primary) parts.push(props.country);
    return parts.join(', ');
}

// Turn a Photon GeoJSON response into our condensed, deduped suggestion list.
function parsePhoton(data) {
    const seen = new Set();
    const out = [];
    for (const feat of data?.features || []) {
        const props = feat.properties || {};
        const label = formatSuggestion(props);
        if (!label || seen.has(label.toLowerCase())) continue;
        seen.add(label.toLowerCase());
        const [lng, lat] = feat.geometry?.coordinates || [];
        if (lat == null || lng == null) continue;
        out.push({
            label,
            lat,
            lng,
            countryCode: props.countrycode ? props.countrycode.toLowerCase() : null,
        });
        if (out.length >= MAX_SUGGESTIONS) break;
    }
    return out;
}

export default function SearchSuggest({
    value,
    onChange,
    onSelect,
    placeholder,
    inputStyle,
    className = 'input-search',
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const wrapRef = useRef(null);
    const debounceRef = useRef(null);
    // Cancels the in-flight request when a newer keystroke arrives, so slow or
    // out-of-order responses can never overwrite fresher results.
    const abortRef = useRef(null);
    // True only when the latest `value` change came from the user typing in the
    // input. Programmatic changes — picking a suggestion, or the map drag
    // syncing its reverse-geocoded address into the box — leave it false, so the
    // dropdown never opens for text the user didn't type.
    const userTypedRef = useRef(false);

    const show = (condensed) => {
        setSuggestions(condensed);
        setActiveIndex(-1);
        setOpen(condensed.length > 0);
    };

    // Debounced, cancellable, cached suggestion fetch driven by the input value.
    // Suggestions are global (world-wide) and never restricted by the country
    // dropdown, so typing "california" while the dropdown is on Philippines
    // still surfaces US results.
    useEffect(() => {
        // Only surface suggestions for text the user actually typed. When the
        // value was set programmatically (a suggestion pick, or the map drag
        // updating the address bar), close the dropdown and bail without
        // fetching.
        if (!userTypedRef.current) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) abortRef.current.abort();
            setSuggestions([]);
            setActiveIndex(-1);
            setOpen(false);
            return;
        }
        userTypedRef.current = false;

        const query = (value || '').trim();
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.length < MIN_QUERY_LENGTH) {
            if (abortRef.current) abortRef.current.abort();
            debounceRef.current = setTimeout(() => show([]), 0);
            return () => clearTimeout(debounceRef.current);
        }
        // Cache hit — render on the next tick (no network call, no debounce wait).
        const cached = cache.get(query.toLowerCase());
        if (cached) {
            debounceRef.current = setTimeout(() => show(cached), 0);
            return () => clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            if (abortRef.current) abortRef.current.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            try {
                const res = await fetch(
                    `${PHOTON_URL}?q=${encodeURIComponent(query)}&limit=10&lang=en`,
                    { signal: controller.signal }
                );
                if (!res.ok) return; // keep whatever is already shown on a transient error
                const data = await res.json();
                const condensed = parsePhoton(data);
                cache.set(query.toLowerCase(), condensed);
                if (!controller.signal.aborted) show(condensed);
            } catch {
                // Aborted or network error — leave the current suggestions as-is
                // rather than blanking the dropdown.
            }
        }, DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [value]);

    // Close the dropdown when clicking outside the widget.
    useEffect(() => {
        const onDocClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const pick = (s) => {
        // The value-change effect won't re-open the dropdown for this
        // programmatic update because userTypedRef stays false.
        setOpen(false);
        setSuggestions([]);
        setActiveIndex(-1);
        onChange(s.label);
        onSelect(s); // { label, lat, lng } — triggers the search immediately
    };

    const onKeyDown = (e) => {
        if (!open || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < suggestions.length) {
                e.preventDefault();
                pick(suggestions[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const searchWords = (value || '').trim().split(/\s+/).filter(Boolean);

    return (
        <div className="search-suggest" ref={wrapRef}>
            <input
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
                aria-controls="search-suggest-list"
                autoComplete="off"
                placeholder={placeholder}
                className={className}
                value={value}
                onChange={(e) => {
                    // Mark this as a real keystroke so the value-change effect
                    // fetches and opens the dropdown.
                    userTypedRef.current = true;
                    onChange(e.target.value);
                }}
                onFocus={() => suggestions.length > 0 && setOpen(true)}
                onKeyDown={onKeyDown}
                style={inputStyle}
            />
            {open && suggestions.length > 0 && (
                <ul className="search-suggest-list" id="search-suggest-list" role="listbox">
                    {suggestions.map((s, i) => (
                        <li
                            key={`${s.label}-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                            className={i === activeIndex ? 'active' : ''}
                            // onMouseDown (not onClick) so the pick fires before
                            // the input's blur closes the list.
                            onMouseDown={(e) => {
                                e.preventDefault();
                                pick(s);
                            }}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            <Highlighter
                                searchWords={searchWords}
                                textToHighlight={s.label}
                                autoEscape
                                highlightClassName="search-suggest-match"
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
