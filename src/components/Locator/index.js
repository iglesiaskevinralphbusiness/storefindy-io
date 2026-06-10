'use client';
import { LuFilter, LuMapPin, LuPhone, LuClock } from "react-icons/lu";
import { HiMiniMagnifyingGlass } from "react-icons/hi2";
import { FaAngleDown } from "react-icons/fa6";
import { formStyles, resultsStyles, mapStyles, userDefinedStyles } from './styles';
import Link from 'next/link';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

// Leaflet touches `window`, so the map is loaded lazily and only rendered after
// mount. React.lazy works in both the Next.js bundle and the esbuild widget bundle.
const LocatorMap = lazy(() => import('./LocatorMap'));

const API_BASE = process.env.NEXT_PUBLIC_ROOT_URL || '';

// Maps JS Date.getDay() (0 = Sunday) to the schema's hours keys.
const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK = [
    ['Mon', 'Monday'], ['Tue', 'Tuesday'], ['Wed', 'Wednesday'], ['Thu', 'Thursday'],
    ['Fri', 'Friday'], ['Sat', 'Saturday'], ['Sun', 'Sunday'],
];

// "08:00" -> "8:00 AM"
function formatTime(value) {
    if (!value) return '';
    const [h, m] = String(value).split(':').map(Number);
    if (Number.isNaN(h)) return value;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

function buildAddress(loc) {
    return [loc.street, loc.city, loc.state, loc.postal, (loc.country || '').toUpperCase()]
        .filter(Boolean)
        .join(', ');
}

function todaysHours(loc) {
    const day = loc.hours?.[DAY_KEYS[new Date().getDay()]];
    if (!day || !day.enabled) return 'Closed';
    return `${formatTime(day.open)} - ${formatTime(day.close)}`;
}

export default function Locator({
    // Identity & map defaults
    locator_id,
    search_radius = 10,
    default_zoom_level = 10,
    detect_location = true,
    filters = [],
    // Feature toggles
    show_search_bar = true,
    show_filters = false,
    show_radius = false,
    show_store_list = true,
    show_phone_number = true,
    show_store_hours = false,
    show_directions = true,
    show_website_link = true,
    // Theme / labels
    pin_color = '#185FA5',
    search_input_placeholder = 'Enter city, state, or postal code',
    search_label = 'Search',
    filter_label = 'Filter',
    get_directions_label = 'Get Directions',
    view_location_label = 'View Store Page',
}) {
    // Configured defaults — the source of truth for the map's first load and for
    // every fresh search. (maximum_results_shown is enforced server-side.)
    const defaultRadius = search_radius ?? 10;
    const defaultZoom = default_zoom_level ?? 10;
    // Radius choices, always including the locator's configured default.
    const radiusOptions = [...new Set([5, 10, 25, 50, 100, defaultRadius])].sort((a, b) => a - b);

    // Search state. `radius` and `filters` live here so the same object can be
    // submitted to the API; `filters` will hold values like ["🏬 Mall", ...].
    const [params, setParams] = useState({
        q: '',
        lat: null,
        lng: null,
        radius: defaultRadius,
        filters: [],
    });
    // Keep a ref in sync so the debounced map-drag handler reads fresh params.
    const paramsRef = useRef(params);
    useEffect(() => { paramsRef.current = params; }, [params]);

    const [locations, setLocations] = useState([]);
    const [center, setCenter] = useState(null);
    const [zoom, setZoom] = useState(defaultZoom);
    const [status, setStatus] = useState('idle'); // idle | loading | success | empty | error
    const [message, setMessage] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [openHours, setOpenHours] = useState({});

    // Result <li> nodes, keyed by location id, so the active one can be scrolled
    // to the top of the list when a map pin (or the item itself) is selected.
    const itemRefs = useRef({});

    const toggleHours = (id) => setOpenHours((prev) => ({ ...prev, [id]: !prev[id] }));

    // Keep the active item in sync with the map: scroll it to the top of the list.
    useEffect(() => {
        if (!activeId) return;
        itemRefs.current[activeId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [activeId]);

    // Single entry point for every search (text, filter, radius, map-drag).
    // `override` is merged onto the latest params so callers only pass what changed.
    const runSearch = async (override = {}) => {
        if (!locator_id) return;
        const p = { ...paramsRef.current, ...override };
        setParams(p);
        setActiveId(null); // results are about to change; drop any stale selection

        const sp = new URLSearchParams();
        sp.set('locator_id', locator_id);
        if (p.q) sp.set('q', p.q);
        if (p.lat != null && p.lng != null) {
            sp.set('lat', String(p.lat));
            sp.set('lng', String(p.lng));
        }
        sp.set('radius', String(p.radius));
        if (p.filters.length) sp.set('filters', p.filters.join(','));

        setStatus('loading');
        try {
            const res = await fetch(`${API_BASE}/api/locations/search?${sp.toString()}`);
            const data = await res.json();
            const items = data.locations || [];
            setLocations(items);
            if (data.center) setCenter([data.center.lat, data.center.lng]);
            if (data.status === 'success' && items.length > 0) {
                setStatus('success');
                setMessage('');
            } else {
                setStatus('empty');
                setMessage(data.message || 'No locations were found using your search criteria. Please try another input address.');
            }
        } catch {
            setStatus('error');
            setMessage('Something went wrong while searching. Please try again.');
        }
    };

    // Optionally center the search on the visitor's location when the widget loads.
    useEffect(() => {
        if (!locator_id) return;
        if (detect_location && typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => runSearch({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => {},
                { timeout: 8000 }
            );
        }
    }, [locator_id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Text search: clear any prior coordinates so the API geocodes the query, and
    // snap the map back to the locator's configured default zoom for the result.
    const onSubmit = (e) => {
        e.preventDefault();
        if (!params.q.trim()) return;
        setZoom(defaultZoom);
        runSearch({ lat: null, lng: null });
    };

    // Auto-search after the user pans/zooms the map (debounced). Coordinates take
    // precedence over `q` server-side, so the query text in the input is preserved.
    const dragTimer = useRef(null);
    const handleMapMove = (c, z) => {
        setZoom(z);
        if (dragTimer.current) clearTimeout(dragTimer.current);
        dragTimer.current = setTimeout(() => {
            runSearch({ lat: c.lat, lng: c.lng });
        }, 600);
    };

    const toggleFilter = (value) => {
        const next = params.filters.includes(value)
            ? params.filters.filter((f) => f !== value)
            : [...params.filters, value];
        // Re-run with the existing center (coords if we have them, else the query).
        runSearch({ filters: next });
    };

    const onRadiusChange = (e) => {
        runSearch({ radius: Number(e.target.value) });
    };

    return (
        <>
            <style>{locatorStyles}</style>
            <div className={`locator large-app`}>
                <div className="locator-sidebar">
                    {show_search_bar && (
                        <form onSubmit={onSubmit}>
                            <div className="inputs">
                                <input
                                    type="text"
                                    placeholder={search_input_placeholder}
                                    className="input-search"
                                    value={params.q}
                                    onChange={(e) => setParams((p) => ({ ...p, q: e.target.value }))}
                                />
                                <button type="submit" className="btn-search">
                                    <HiMiniMagnifyingGlass />{search_label}
                                </button>
                                {show_filters && (
                                    <button type="button" className="btn-filter" onClick={() => setShowFilters((v) => !v)}>
                                        <LuFilter /> {filter_label}
                                    </button>
                                )}
                            </div>

                            {(show_filters && showFilters) && (
                                <div className="filter-panel">
                                    {filters.map((f) => (
                                        <label key={f} className="filter-option">
                                            <input
                                                type="checkbox"
                                                checked={params.filters.includes(f)}
                                                onChange={() => toggleFilter(f)}
                                            />
                                            <span>{f}</span>
                                        </label>
                                    ))}
                                    {filters.length === 0 && (
                                        <p className="filter-empty">No filters configured.</p>
                                    )}
                                </div>
                            )}

                            {show_radius && (
                                <div className="radius-control">
                                    <label htmlFor="locator-radius">Radius</label>
                                    <select id="locator-radius" value={params.radius} onChange={onRadiusChange}>
                                        {radiusOptions.map((r) => (
                                            <option key={r} value={r}>{r} mi</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </form>
                    )}

                    <div className="results">
                        {status === 'loading' && (
                            <p className="results-count"><LuMapPin /> Searching…</p>
                        )}
                        {status === 'success' && (
                            <p className="results-count" role="alert" aria-atomic="true">
                                <LuMapPin /> {locations.length} location{locations.length === 1 ? '' : 's'} found near you
                            </p>
                        )}
                        {(status === 'empty' || status === 'error') && (
                            <p className="results-error" role="alert" aria-atomic="true">{message}</p>
                        )}
                        {status === 'idle' && (
                            <p className="results-count"><LuMapPin /> Search a city, state, or postal code to find locations.</p>
                        )}

                        {show_store_list && (
                            <ul className="results-list">
                                {locations.map((location, index) => (
                                    <li
                                        key={location._id}
                                        ref={(el) => { itemRefs.current[location._id] = el; }}
                                        className={activeId === location._id ? 'active' : ''}
                                        onClick={() => setActiveId(location._id)}
                                    >
                                        <div className="title">
                                            <h2>
                                                <span>{index + 1}</span>
                                                <span>{location.name}</span>
                                            </h2>
                                            {typeof location.distance === 'number' && (
                                                <p>{location.distance.toFixed(1)} mi</p>
                                            )}
                                        </div>
                                        <div className="details">
                                            <p className="address"><LuMapPin /> {buildAddress(location)}</p>
                                            {show_phone_number && location.phone && (
                                                <Link href={`tel:${location.phone}`} className="phone"><LuPhone /> {location.phone}</Link>
                                            )}
                                            {show_store_hours && location.hours && (
                                                <>
                                                    <div className="todays-hours">
                                                        <p><LuClock /> Today&apos;s Hours:</p>
                                                        <p>{todaysHours(location)}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className={`btn-store-hours${openHours[location._id] ? ' open' : ''}`}
                                                        onClick={() => toggleHours(location._id)}
                                                        aria-expanded={!!openHours[location._id]}
                                                    >
                                                        <LuClock /> Store Hours <FaAngleDown />
                                                    </button>
                                                    <ul className={`store-hours${openHours[location._id] ? ' open' : ''}`}>
                                                        {WEEK.map(([key, label]) => {
                                                            const d = location.hours?.[key];
                                                            return (
                                                                <li key={key}>
                                                                    <span>{label}</span>
                                                                    <span>{d?.enabled ? `${formatTime(d.open)} - ${formatTime(d.close)}` : 'Closed'}</span>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </>
                                            )}
                                        </div>
                                        <div className="actions">
                                            {show_directions && (
                                                <Link
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
                                                    target="_blank"
                                                >
                                                    {get_directions_label}
                                                </Link>
                                            )}
                                            {show_website_link && location.website && (
                                                <Link href={location.website} target="_blank">
                                                    {view_location_label}
                                                </Link>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <div className="locator-map">
                    <Suspense fallback={<div className="map-loading">Loading map…</div>}>
                        <LocatorMap
                            locations={locations}
                            center={center}
                            zoom={zoom}
                            radiusMiles={params.radius}
                            pinColor={pin_color}
                            activeId={activeId}
                            onMove={handleMapMove}
                            onSelect={setActiveId}
                        />
                    </Suspense>
                </div>
            </div>
        </>
    );
}


export const locatorStyles = `
.locator {
    display: flex;
    flex-direction: row;
    flex: 1;
    height: 700px;
    width: 100%;
    font-size: 14px;
    overflow: hidden;
}
.locator-sidebar {
    display: flex;
    flex-direction: column;
    max-width: 470px;
    width: 470px;
    padding: 24px;
    box-sizing: border-box;
}
${formStyles}
${resultsStyles}
${mapStyles}
${userDefinedStyles}
`;