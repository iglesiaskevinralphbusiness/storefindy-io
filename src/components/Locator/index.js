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
import { FiLink } from "react-icons/fi";
import { LuFilter, LuPhone, LuClock, LuListFilter, LuMap, LuList, LuMapPin, LuMapPinned, LuArrowRight, LuArrowLeft, LuChevronLeft, LuChevronRight, LuCircleChevronLeft, LuCircleChevronRight, LuX } from "react-icons/lu";
import { formStyles, resultsStyles, mapStyles, userDefinedStyles, formStyle2Styles } from './styles';
import Link from 'next/link';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { COUNTRIES } from '@/utils/constant/countries';
import { SOCIAL_MEDIA_LINKS, SEARCH_RADII } from '@/utils/constant';

import SearchSuggest from './SearchSuggest';

// Leaflet touches `window`, so the map is loaded lazily and only rendered after
// mount. React.lazy works in both the Next.js bundle and the esbuild widget bundle.
const LocatorMap = lazy(() => import('./LocatorMap'));

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

// Reverse-geocode a coordinate via the free OpenStreetMap Nominatim service.
// Returns the lowercase ISO country code and a "city, state, postal" label for
// the location. Used to default the country dropdown on first load and to sync
// the search input + dropdown to the map's center after a drag.
async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`
        );
        if (!res.ok) return null;
        const data = await res.json();
        const a = data?.address || {};
        const city = a.city || a.town || a.village || a.municipality || a.county || '';
        const label = [city, a.state, a.postcode].filter(Boolean).join(', ');
        return {
            countryCode: a.country_code?.toLowerCase() || null,
            label,
        };
    } catch {
        return null;
    }
}

export default function Locator({
    isDemo = false,
    // active/Inactive
    isInactive = false,
    inactiveForm = <></>,
    // Identity & map defaults
    locator_id,
    available_countries = [default_country],
    user_plan = 'free',
    search_radius = 10,
    default_zoom_level = 10,
    detect_location = true,
    default_country = '',
    filters = [],
    // Theme / labels
    settings = {},
    features = {},
}) {

    if(isInactive === 'inactive') {
        return inactiveForm;
    }


    // Configured defaults — the source of truth for the map's first load and for
    // every fresh search. (maximum_results_shown is enforced server-side.)
    const defaultRadius = search_radius ?? 10;
    const defaultZoom = default_zoom_level ?? 10;
    // Open the map on the locator's configured country (e.g. "jp", "us", "ph")
    // instead of the hardcoded world fallback. This is the first-load view when
    // auto-detect is off, and also the fallback when auto-detect is on but the
    // browser blocks/denies geolocation.
    const countryView = COUNTRIES.find((c) => c.code === String(default_country || '').toLowerCase());
    const defaultCenter = countryView ? [countryView.lat, countryView.lng] : null;
    // Radius choices come from the shared SEARCH_RADII constant, always
    // including the locator's configured default even if it isn't a preset.
    const radiusOptions = [...new Set([...SEARCH_RADII.map((r) => Number(r.code)), defaultRadius])]
        .sort((a, b) => a - b);

    // Country dropdown choices — restricted to the locator's configured
    // available_countries (a list of codes like ["us", "ph"]). Falls back to the
    // full list when none are configured.
    const availableCodes = (available_countries || [])
        .filter(Boolean)
        .map((c) => String(c).toLowerCase());
    // Ensure the locator's default country is always selectable, even if it was
    // left out of the configured available_countries list.
    const defaultCode = String(default_country || '').toLowerCase();
    if (defaultCode && !availableCodes.includes(defaultCode)) {
        availableCodes.push(defaultCode);
    }
    const countryOptions = availableCodes.length
        ? COUNTRIES.filter((c) => availableCodes.includes(c.code))
        : COUNTRIES;
    // Only auto-default the dropdown to the geolocated country when there's an
    // actual choice to make (2+ options).
    const hasCountryChoices = countryOptions.length >= 2;

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
    // Separate from `center`: this is the only value that moves the map view via
    // <Recenter>. Map-drag searches deliberately leave it untouched.
    const [recenterCenter, setRecenterCenter] = useState(null);
    const [zoom, setZoom] = useState(defaultZoom);
    const [status, setStatus] = useState('idle'); // idle | loading | success | empty | error
    const [message, setMessage] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [openHours, setOpenHours] = useState({});
    const [showListMap, setShowListMap] = useState('list');

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
    // `override` is merged onto the latest params so callers only pass what
    // changed. `recenter` forces the map view to the result center — true for
    // text-search/geolocation, but false for map-drag searches, where the user
    // is already positioned and snapping the view back would fight their panning.
    const runSearch = async (override = {}, { recenter = true } = {}) => {
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
            let isRecordQuery = false;
            const method = p.method || '';
            if(method === 'form-submit' || method === 'search-suggest' || method === 'country-change') {
                if(user_plan === 'business') {
                    isRecordQuery = true;
                }
            }
            
            // Always hit the canonical `www` host directly. Pointing at the apex
            // (`storefindy.com`) triggers Vercel's apex->www 308 redirect, and the
            // browser drops the CORS headers across that cross-origin redirect,
            // which surfaces as a CORS block when the widget runs on a tenant
            // sub-domain (demo.storefindy.com) or a third-party embed. This mirrors
            // the get-locator call in LocatorWidget.tsx.
            const res = await fetch(`https://www.storefindy.com/api/locations/search?${sp.toString()}&is_demo=${isDemo}&is_record_query=${isRecordQuery}`);
            // Local testing: comment the line above and use the localhost API instead.
            // const res = await fetch(`http://localhost:3000/api/locations/search?${sp.toString()}&is_demo=${isDemo}&is_record_query=${isRecordQuery}`);
            const data = await res.json();
            const items = data.locations || [];
            setLocations(items);
            if (data.center) {
                // `center` drives the radius circle and follows every search.
                setCenter([data.center.lat, data.center.lng]);
                // `recenterCenter` is what actually moves the map view, so we
                // only update it when a recenter was requested.
                if (recenter) setRecenterCenter([data.center.lat, data.center.lng]);
            }
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

    // Optionally center the search on the visitor's location when the widget
    // loads. When the country dropdown offers a real choice (2+ options), also
    // default it to the visitor's geolocated country (if it's one of the
    // configured options). If geolocation is disabled or denied, the dropdown
    // keeps its initial value of `default_country`.
    useEffect(() => {
        if (!locator_id) return;
        if (detect_location && typeof navigator !== 'undefined' && navigator.geolocation) {
            const onSuccess = async (pos) => {
                const { latitude, longitude } = pos.coords;
                let country;
                if (hasCountryChoices) {
                    const geo = await reverseGeocode(latitude, longitude);
                    const code = geo?.countryCode;
                    if (code && availableCodes.includes(code)) country = code;
                }
                runSearch({ method: 'geolocation', lat: latitude, lng: longitude, ...(country ? { country } : {}) });
            };

            // kCLErrorLocationUnknown (POSITION_UNAVAILABLE, code 2) is usually
            // transient: on first load CoreLocation often hasn't acquired a fix
            // yet. Retry once before giving up. PERMISSION_DENIED (code 1) is
            // terminal, so we don't retry that — we just keep the default view.
            const request = (canRetry) => {
                navigator.geolocation.getCurrentPosition(
                    onSuccess,
                    (err) => {
                        if (canRetry && err && err.code === err.POSITION_UNAVAILABLE) {
                            request(false);
                        }
                        // On terminal failure we keep the locator's default-country
                        // view (defaultCenter) — same as when detect_location is off.
                    },
                    // maximumAge lets a recently-acquired fix be reused instantly,
                    // which avoids the cold-start failure entirely when one exists.
                    { timeout: 8000, maximumAge: 600000, enableHighAccuracy: false }
                );
            };

            request(true);
        } else if (!detect_location) {
            // Auto-detect is off: open the widget already showing this locator's
            // stores for the configured default country rather than an empty map.
            // A country-only search (no query/coords) returns no center from the
            // API, so the map view stays on default_country (defaultCenter) while
            // the pins and result list populate. 'default-load' is deliberately
            // not one of the analytics-recorded methods.
            runSearch({ method: 'default-load', country: String(default_country || '').toLowerCase() });
        }
    }, [locator_id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Text search: clear any prior coordinates so the API geocodes the query, and
    // snap the map back to the locator's configured default zoom for the result.
    const onSubmit = (e) => {
        e.preventDefault();
        if (!params.q.trim()) return;
        setZoom(defaultZoom);
        runSearch({ lat: null, lng: null, method: 'form-submit' });
    };

    // Auto-search after the user pans/zooms the map (debounced). Coordinates take
    // precedence over `q` server-side. We also reverse-geocode the new center so
    // the search input and country dropdown reflect what the map is showing.
    const dragTimer = useRef(null);
    const handleMapMove = (c, z) => {
        setZoom(z);
        if (dragTimer.current) clearTimeout(dragTimer.current);
        dragTimer.current = setTimeout(async () => {
            const geo = await reverseGeocode(c.lat, c.lng);
            const override = { lat: c.lat, lng: c.lng };
            // Mirror the map's location into the search box and dropdown only
            // when its country is one of the configured options. If the user
            // dragged to a country outside the list, clear the input instead.
            if (geo?.countryCode && availableCodes.includes(geo.countryCode)) {
                override.country = geo.countryCode;
                override.q = geo.label || '';
            } else {
                override.q = '';
            }
            // Don't recenter: the map is already where the user dragged it.
            runSearch(override, { recenter: false, method: 'map-move' });
        }, 600);
    };

    const toggleFilter = (value) => {
        const next = params.filters.includes(value)
            ? params.filters.filter((f) => f !== value)
            : [...params.filters, value];
        // Re-run with the existing center (coords if we have them, else the query).
        runSearch({ filters: next, method: 'filter-toggle' });
    };

    const onRadiusChange = (e) => {
        runSearch({ radius: Number(e.target.value), method: 'radius-change' });
    };

    // Changing the country only affects how a text query is geocoded. If the
    // visitor has already typed something, re-run the search (clearing coords so
    // the API re-geocodes the query against the new country); otherwise just
    // remember the choice for the next search.
    const onCountryChange = (e) => {
        const country = e.target.value;
        if (params.q.trim()) {
            setZoom(defaultZoom);
            runSearch({ country, lat: null, lng: null, method: 'country-change' });
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
        if(value === 'none') return '0';
        if(value === 'rounded') return '10px';
        if(value === 'pill') return '20px';
        if(value === 'square') return '0';
        return '0';
    }

    const getFormStyle = () => {
        if(user_plan !== 'business') return '';
        if(features.form_style === 'style-2') return 'form-style-2';
        if(features.form_style === 'style-3') return 'form-style-3';
        return '';
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
                    <span>{index + 1}. {location.name}</span>
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
                                    <LuClock /> Business Hours <FaAngleDown />
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
                {location.filters?.length > 0 && (
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
                {location.social_media_links?.length > 0 && (
                    <div className="social-media-links">
                        {location.social_media_links.map((link) => {
                            const media = SOCIAL_MEDIA_LINKS.find((m) => m.code === link.code);
                            return (
                                <Link
                                    href={link.link}
                                    target="_blank"
                                    key={link.code}
                                    title={media?.label || link.code}
                                    aria-label={media?.label || link.code}
                                >
                                    {media?.icon || <FiLink />}
                                </Link>
                            );
                        })}
                    </div>
                )}
                {location.custom_notes && (
                    <div className="note">{location.custom_notes}</div>
                )}
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

    const handleClickSelectLocation = async (id) => {
        setActiveId(id);

        let isRecordQuery = false;
        if(user_plan === 'business') {
            isRecordQuery = true;
        }
        
        try {
            // Same canonical-host reasoning as the search call in runSearch: the
            // widget runs on tenant sub-domains and third-party embeds, so it must
            // POST straight to the `www` host and never the apex (which redirects
            // and drops CORS headers).
            await fetch(`https://www.storefindy.com/api/locations/result-clicked?location_id=${id}&is_demo=${isDemo}&is_record_query=${isRecordQuery}`, {
                method: 'POST',
            });
            // Local testing: comment the line above and use the localhost API instead.
            // await fetch(`http://localhost:3000/api/locations/result-clicked?location_id=${id}&is_demo=${isDemo}&is_record_query=${isRecordQuery}`, { method: 'POST' });
        } catch (error) {
            console.error('Failed to record location click:');
        }
        
    }

    return (
        <div className="locator-container">
            <style>{locatorStyles}</style>
            
            <div
                className={
                    `locator ${getAppHeight()}
                    ${countryOptions.length > 1 && features.show_radius ? 'form2columns' : ''}
                    ${getFormStyle()}
                    `
                }
                style={
                    {
                        backgroundColor: settings.background,
                        color: settings.text_color,
                        fontFamily: settings.font_family,
                        fontSize: settings.font_size,
                        borderRadius: getBorderStyle(settings.border),
                        borderColor: settings.border_color,
                        borderStyle: settings.border === 'none' || settings.border === '' || !settings.border ? 'none' : 'solid',
                        borderWidth: settings.border === 'none' || settings.border === '' || !settings.border ? '0px' : '1px'
                    }
                }
            >
                <div
                    className="locator-sidebar"
                    style={{
                        backgroundColor: settings.background,
                    }}
                >
                    {features.show_search_bar && (
                        <form onSubmit={onSubmit}>
                            <div className="inputs">
                                <SearchSuggest
                                    placeholder={settings.searchInput.placeholder}
                                    value={params.q}
                                    onChange={(q) => setParams((p) => ({ ...p, q }))}
                                    onSelect={(s) => {
                                        // Suggestion carries exact coordinates, so
                                        // search on those directly rather than
                                        // re-geocoding the text. Snap back to the
                                        // configured zoom for the result.
                                        setZoom(defaultZoom);
                                        runSearch({
                                            q: s.label,
                                            lat: s.lat,
                                            lng: s.lng,
                                            ...(s.countryCode && availableCodes.includes(s.countryCode)
                                                ? { country: s.countryCode }
                                                : {}),
                                            method: 'search-suggest',
                                        });
                                    }}
                                    inputStyle={{
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
                                <div className="country-control" style={ countryOptions.length > 1 ? { display: 'flex', flex: 1 } : { display: 'none', flex: 1 }}>
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
                                        {countryOptions.map((c) => (
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
                                    <div className="filter-panel-header">
                                        <span className="filter-panel-title" style={{ color: settings.filterList.text_color }}>Filters</span>
                                        <button
                                            type="button"
                                            className="btn-filter-close"
                                            onClick={() => setShowFilters(false)}
                                            aria-label="Close filters"
                                            style={{ color: settings.filterList.text_color }}
                                        >
                                            <LuX />
                                        </button>
                                    </div>
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

                    <div
                        className="mobile-tabs"
                        style={{
                            backgroundColor: settings.mobileView.background,
                            color: settings.mobileView.text_color,
                        }}
                    >
                        <div
                            className={'mobile-tab-item' + (showListMap === 'list' ? ' active' : '')}
                            style={showListMap === 'list' ?{
                                borderColor: settings.mobileView.active_border_color,
                                backgroundColor: settings.mobileView.active_background,
                            } : {}}
                            onClick={() => setShowListMap('list')}
                        >
                            <LuList />
                            <span>List View</span>
                        </div>
                        <div
                            className={'mobile-tab-item' + (showListMap === 'map' ? ' active' : '')}
                            style={showListMap === 'map' ?{
                                borderColor: settings.mobileView.active_border_color,
                                backgroundColor: settings.mobileView.active_background,
                            } : {}}
                            onClick={() => setShowListMap('map')}
                        >
                            <LuMap />
                            <span>Map View</span>
                        </div>
                    </div>

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
                            <ul
                                className={'results-list' + (showListMap === 'list' ? ' mobile-tab-content-active' : ' mobile-tab-content-inactive')}
                                ref={listRef}
                            >
                                {locations.map((location, index) => (
                                    <li
                                        key={location._id}
                                        ref={(el) => { itemRefs.current[location._id] = el; }}
                                        className={activeId === location._id ? 'active' : ''}
                                        onClick={() => handleClickSelectLocation(location._id)}
                                        style={{
                                            borderColor: settings.resultItem.border_color,
                                            backgroundColor: settings.resultItem.background,
                                            ...(activeId === location._id && {
                                                borderColor: settings.resultItem.active_border_color,
                                                backgroundColor: settings.resultItem.active_background,
                                            }),
                                            borderRadius: getBorderStyle(settings.resultItem.border),
                                            borderStyle: settings.resultItem.border === 'none' || settings.resultItem.border === '' || !settings.resultItem.border ? 'none' : 'solid',
                                        
                                        }}
                                    >
                                        {renderLocationCard(location, index)}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <div className={'locator-map' + (showListMap === 'map' ? ' mobile-tab-content-active' : ' mobile-tab-content-inactive')}>
                    <Suspense fallback={<div className="map-loading">Loading map…</div>}>
                        <LocatorMap
                            locations={locations}
                            center={center}
                            recenterCenter={recenterCenter}
                            zoom={zoom}
                            defaultCenter={defaultCenter}
                            radiusMiles={features.show_map_radius_indicator ? params.radius : 0}
                            showPinNumber={features.show_map_pin_number}
                            pinColor={settings.pin.color}
                            pinSize={settings.pin.size}
                            pinTextColor={settings.pin.text_color}
                            pinTextSize={settings.pin.text_size}
                            pinType={settings.pin.type}
                            pinImage={settings.pin.image}
                            activeId={activeId}
                            focusedZoom={features.focused_zoom}
                            onMove={handleMapMove}
                            onSelect={setActiveId}
                            renderPopup={(loc, index) => renderLocationCard(loc, index, { showStoreHoursToggle: false })}
                        />
                    </Suspense>
                    {features.powered_by_storefindy !== false && (
                        <div className="powered-by">Mapping Locator Powered by <a href="https://www.storefindy.com" target="_blank">Storefindy</a> Copyright © {new Date().getFullYear()}, All Rights Reserved.</div>
                    )}
                </div>
            </div>
        </div>
    );
}


export const locatorStyles = `
.locator-container {
    container-type: inline-size;
    container-name: container;
}
.locator {
    position: relative;
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
.locator-sidebar form {
    position: sticky;
}
.locator p {
    padding: 0;
    margin: 0;
}
.locator ul {
    margin: 0;
    padding: 0;
    list-style: none;
    width: auto;
}
.locator a {
    text-decoration: none;
    color: inherit;
}
@container (max-width: 767px) {
    .locator {
        display: block;
        padding: 12px;
        height: auto !important;
    }
    .locator-sidebar {
        max-width: none;
        min-height: 600px;
        width: auto;
        padding: 0;
    }
}
${formStyles}
${resultsStyles}
${mapStyles}
${userDefinedStyles}
${formStyle2Styles}
.inactive {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 700px;
    background: #fff;
    font-size: 16px;
}
.inactive-content {
    width: 400px;
    height: 300px;
    padding: 20px;
    box-sizing: border-box;
}
.inactive-content .msg{
    padding: 20px;
    border-radius: 6px;
    color: rgb(153, 27, 27);
    background-color: rgb(254, 242, 242);
    font-size: 15px;
}
.inactive-content .inactive-powered-by {
    padding-top: 20px;
    border-top: 1px solid #e5e5e5;
    font-size: 16px;
    text-align: center;
}
`;