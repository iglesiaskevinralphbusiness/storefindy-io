'use client';
import { HiMiniMagnifyingGlass } from "react-icons/hi2";
import { FaAngleDown } from "react-icons/fa6";
import { BiSearchAlt } from "react-icons/bi";
import { VscSearchFuzzy } from "react-icons/vsc";
import { TbMapSearch } from "react-icons/tb";
import { TbMapPinSearch } from "react-icons/tb";
import { TbShoppingBagSearch } from "react-icons/tb";
import { RiFilterFill } from "react-icons/ri";
import { IoFilterCircleOutline } from "react-icons/io5";
import { MdOutlineMyLocation } from "react-icons/md";
import { FiLink } from "react-icons/fi";
import { LuFilter, LuPhone, LuClock, LuListFilter, LuMap, LuMapPin, LuMapPinned, LuArrowRight, LuArrowLeft, LuChevronLeft, LuChevronRight, LuCircleChevronLeft, LuCircleChevronRight } from "react-icons/lu";
import { formStyles, resultsStyles, mapStyles, userDefinedStyles } from './styles';
import Link from 'next/link';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { COUNTRIES } from '@/utils/constant/countries';

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
    default_country = '',
    filters = [],
    // Theme / labels
    settings = {},
    features = {},
}) {
    // Configured defaults — the source of truth for the map's first load and for
    // every fresh search. (maximum_results_shown is enforced server-side.)
    const defaultRadius = search_radius ?? 10;
    const defaultZoom = default_zoom_level ?? 10;
    // When auto-detect is off, open the map on the locator's configured country
    // (e.g. "jp", "us", "ph") instead of the hardcoded world fallback.
    const countryView = !detect_location
        ? COUNTRIES.find((c) => c.code === String(default_country || '').toLowerCase())
        : null;
    const defaultCenter = countryView ? [countryView.lat, countryView.lng] : null;
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
        // Country used to bias/restrict text-search geocoding. Defaults to the
        // locator's configured country but the visitor can override it via the
        // country dropdown so e.g. a US-default map can still find PH places.
        country: String(default_country || '').toLowerCase(),
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
    // The scrollable results <ul>, so selecting an item scrolls only the list
    // and never the whole page.
    const listRef = useRef(null);

    const toggleHours = (id) => setOpenHours((prev) => ({ ...prev, [id]: !prev[id] }));

    // Keep the active item in sync with the map: scroll it to the top of the
    // list. We adjust the list's own scroll position (rather than
    // scrollIntoView, which scrolls every scrollable ancestor including the
    // page) so only the .results-list ul moves.
    useEffect(() => {
        if (!activeId) return;
        const list = listRef.current;
        const item = itemRefs.current[activeId];
        if (!list || !item) return;
        const delta = item.getBoundingClientRect().top - list.getBoundingClientRect().top;
        list.scrollBy({ top: delta, behavior: 'smooth' });
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
        if (p.country) sp.set('country', p.country);

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

    // Changing the country only affects how a text query is geocoded. If the
    // visitor has already typed something, re-run the search (clearing coords so
    // the API re-geocodes the query against the new country); otherwise just
    // remember the choice for the next search.
    const onCountryChange = (e) => {
        const country = e.target.value;
        if (params.q.trim()) {
            setZoom(defaultZoom);
            runSearch({ country, lat: null, lng: null });
        } else {
            setParams((p) => ({ ...p, country }));
        }
    };

    const getAppHeight = () => {
        if(settings.height === 'small') return 'small-app';
        if(settings.height === 'medium') return 'medium-app';
        if(settings.height === 'large') return 'large-app';
        return 'large-app';
    }

    const getBorderStyle = (value) => {
        if(value === 'rounded') return '10px';
        if(value === 'pill') return '20px';
        if(value === 'square') return '0';
        return '0';
    }

    const getButtonIcon = (icon) => {
        // search button
        if(icon === 'magnifying-glass') return <HiMiniMagnifyingGlass />;
        if(icon === 'magnifying-glass2') return <BiSearchAlt />;
        if(icon === 'magnifying-glass3') return <VscSearchFuzzy />;
        if(icon === 'map') return <TbMapSearch />;
        if(icon === 'pin') return <TbMapPinSearch />;
        if(icon === 'shopping-bag') return <TbShoppingBagSearch />;

        // filter button
        if(icon === 'funnel') return <LuFilter />;
        if(icon === 'funnel-solid') return <RiFilterFill />;
        if(icon === 'list-filter') return <LuListFilter />;
        if(icon === 'filter-circle') return <IoFilterCircleOutline />;

        // get directions / view location button
        if(icon === 'map-view') return <LuMap />;
        if(icon === 'pin-view') return <LuMapPin />;
        if(icon === 'pinned') return <LuMapPinned />;
        if(icon === 'arrow-right') return <LuArrowRight />;
        if(icon === 'arrow-left') return <LuArrowLeft />;
        if(icon === 'chevron-left') return <LuChevronLeft />;
        if(icon === 'chevron-right') return <LuChevronRight />;
        if(icon === 'circle-chevron-left') return <LuCircleChevronLeft />;
        if(icon === 'circle-chevron-right') return <LuCircleChevronRight />;

        return '';
    }

    // Inner content of a single result — shared by the list <li> and the map
    // popup so both render identical information and UI.
    const renderLocationCard = (location, index, { showStoreHoursToggle = true } = {}) => (
        <>
            <div className="title">
                <h2>
                    <span>{location.name}</span>
                </h2>
                {typeof location.distance === 'number' && (
                    <p>{location.distance.toFixed(1)} mi</p>
                )}
            </div>
            <div className="details">
                <p className="address"><LuMapPin /> {buildAddress(location)}</p>
                {location.phone && (
                    <Link href={`tel:${location.phone}`} className="phone">
                        <LuPhone /> {location.phone}
                    </Link>
                )}
                {location.website && (
                    <div className="website">
                        <FiLink />
                        <Link href={location.website} target="_blank">{location.website}</Link>
                    </div>
                )}
                {features.show_store_hours && location.hours && (
                    <>
                        <div className="todays-hours">
                            <p><LuClock /> Today&apos;s Hours:</p>
                            <p>{todaysHours(location)}</p>
                        </div>
                        {showStoreHoursToggle && (
                            <>
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
                    </>
                )}
                {location.filters.length > 0 && (
                    <div className="filters-checked">
                        {location.filters.map((filter, index) => (
                            <span
                                index={'filter-'+index}
                                key={filter}
                                style={{
                                    backgroundColor: settings.filterList.active_background,
                                    color: settings.filterList.active_text_color,
                                }}
                            >{filter}</span>
                        ))}
                    </div>
                )}
                <div className="note">{location.custom_notes}</div>
            </div>
            <div className="actions">
                {features.show_directions && (
                    <Link
                        href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
                        target="_blank"
                        style={{
                            backgroundColor: settings.getDirections.background,
                            color: settings.getDirections.text_color,
                            borderRadius: getBorderStyle(settings.getDirections.border),
                        }}
                    >
                        {getButtonIcon(settings.getDirections.icon)}{settings.getDirections.label}
                    </Link>
                )}
                {location.view_location_url && (
                    <Link
                        href={location.view_location_url}
                        target="_blank"
                        style={{
                            backgroundColor: settings.viewLocation.background,
                            color: settings.viewLocation.text_color,
                            borderRadius: getBorderStyle(settings.viewLocation.border),
                        }}
                    >
                        {getButtonIcon(settings.viewLocation.icon)}{settings.viewLocation.label}
                    </Link>
                )}
            </div>
        </>
    );

    return (
        <>
            <style>{locatorStyles}</style>
            <div
                className={`locator ${getAppHeight()}`}
                style={
                    {
                        backgroundColor: settings.background,
                        color: settings.text_color,
                        fontFamily: settings.font_family,
                        fontSize: settings.font_size
                    }
                }
            >
                <div className="locator-sidebar">
                    {features.show_search_bar && (
                        <form onSubmit={onSubmit}>
                            <div className="inputs">
                                <input
                                    type="text"
                                    placeholder={settings.searchInput.placeholder}
                                    className="input-search"
                                    value={params.q}
                                    onChange={(e) => setParams((p) => ({ ...p, q: e.target.value }))}
                                    style={{
                                        borderColor: settings.searchInput.border_color,
                                        backgroundColor: settings.searchInput.background,
                                        color: settings.searchInput.text_color,
                                        borderRadius: getBorderStyle(settings.searchInput.border),
                                    }}
                                />
                                <button
                                    type="submit"
                                    className="btn-search"
                                    style={{
                                        backgroundColor: settings.search.background,
                                        color: settings.search.text_color,
                                        borderRadius: getBorderStyle(settings.search.border),
                                    }}
                                >
                                    {getButtonIcon(settings.search.icon)}{settings.search.label}
                                </button>
                                {features.show_filters && (
                                    <button
                                        type="button"
                                        className="btn-filter"
                                        onClick={() => setShowFilters((v) => !v)}
                                        style={{
                                            backgroundColor: settings.filter.background,
                                            color: settings.filter.text_color,
                                            borderRadius: getBorderStyle(settings.filter.border),
                                        }}
                                    >
                                        {getButtonIcon(settings.filter.icon)}{settings.filter.label}
                                    </button>
                                )}
                            </div>
                            
                            <div className="other-inputs">
                                <div className="country-control">
                                    <label htmlFor="locator-country">Country</label>
                                    <select
                                        id="locator-country"
                                        value={params.country}
                                        onChange={onCountryChange}
                                        style={{
                                            borderColor: settings.searchInput.border_color,
                                            backgroundColor: settings.searchInput.background,
                                            color: settings.searchInput.text_color,
                                            borderRadius: getBorderStyle(settings.searchInput.border),
                                        }}
                                    >
                                        <option value="">All countries</option>
                                        {COUNTRIES.map((c) => (
                                            <option key={c.code} value={c.code}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {features.show_radius && (
                                    <div className="radius-control">
                                        <label htmlFor="locator-radius">Radius</label>
                                        <select
                                            id="locator-radius"
                                            value={params.radius}
                                            onChange={onRadiusChange}
                                            style={{
                                                borderColor: settings.searchInput.border_color,
                                                backgroundColor: settings.searchInput.background,
                                                color: settings.searchInput.text_color,
                                                borderRadius: getBorderStyle(settings.searchInput.border),
                                            }}
                                        >
                                            {radiusOptions.map((r) => (
                                                <option key={r} value={r}>{r} mi</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {(features.show_filters && showFilters) && (
                                <div
                                    className="filter-panel"
                                    style={{
                                        borderColor: settings.filterList.border_color,
                                        backgroundColor: settings.filterList.background,
                                    }}
                                >
                                    {filters.map((f) => (
                                        <label key={f} className="filter-option">
                                            <input
                                                type="checkbox"
                                                checked={params.filters.includes(f)}
                                                onChange={() => toggleFilter(f)}
                                            />
                                            <span style={{ color: settings.filterList.text_color }}>{f}</span>
                                        </label>
                                    ))}
                                    {filters.length === 0 && (
                                        <p className="filter-empty" style={{ color: settings.filterList.text_color }}>No filters configured.</p>
                                    )}
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

                        {features.show_store_list && (
                            <ul className="results-list" ref={listRef}>
                                {locations.map((location, index) => (
                                    <li
                                        key={location._id}
                                        ref={(el) => { itemRefs.current[location._id] = el; }}
                                        className={activeId === location._id ? 'active' : ''}
                                        onClick={() => setActiveId(location._id)}
                                        style={{
                                            borderColor: settings.resultItem.border_color,
                                            backgroundColor: settings.resultItem.background,
                                            ...(activeId === location._id && {
                                                borderColor: settings.resultItem.active_border_color,
                                            }),
                                        }}
                                    >
                                        {renderLocationCard(location, index)}
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
                            defaultCenter={defaultCenter}
                            radiusMiles={features.show_map_radius_indicator ? params.radius : 0}
                            showPinNumber={features.show_map_pin_number}
                            pinColor={settings.pin.color}
                            pinSize={settings.pin.size}
                            pinTextColor={settings.pin.text_color}
                            pinTextSize={settings.pin.text_size}
                            activeId={activeId}
                            focusedZoom={features.focused_zoom}
                            onMove={handleMapMove}
                            onSelect={setActiveId}
                            renderPopup={(loc, index) => renderLocationCard(loc, index, { showStoreHoursToggle: false })}
                        />
                    </Suspense>
                    <div className="powered-by">Mapping Locator Powered by <a href="https://www.storefindy.com" target="_blank">Storefindy</a> Copyright © {new Date().getFullYear()}, All Rights Reserved.</div>
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