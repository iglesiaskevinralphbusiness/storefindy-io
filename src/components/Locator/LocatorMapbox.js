'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'mapbox-gl/dist/mapbox-gl.css';
import loadMapboxGl from './mapbox-loader';
import { iconForLocation, personIcon } from './pin-icons';
import {
    resolveMapboxStyle,
    resolveMapboxConfig,
    MAPBOX_CONFIG_IMPORT_ID,
    MAPBOX_3D_PITCH,
    MAPBOX_3D_MAX_PITCH,
} from '@/utils/constant/mapbox-styles';

// The Mapbox renderer, used when a locator sets `map_library: 'mapbox'`. It is
// a feature-for-feature counterpart to LocatorMap (Leaflet): same props, same
// pins (see ./pin-icons.js), same popup cards, same radius circle, same
// dynamic-search behaviour. A locator can switch libraries and lose nothing.
//
// mapbox-gl is an imperative library rather than a React one, so where
// LocatorMap composes react-leaflet components this file drives one map
// instance through effects. It is lazily imported by <Locator />, and the
// library itself is lazily loaded by ./mapbox-loader.
//
// Coordinate order is the one difference to stay alert to: this component's
// props use Leaflet's [lat, lng] (so the two renderers are drop-in swaps) while
// mapbox-gl wants [lng, lat] everywhere. `toLngLat` is the only crossing point.

const RADIUS_SOURCE_ID = 'locator-radius';
const RADIUS_FILL_LAYER_ID = 'locator-radius-fill';
const RADIUS_LINE_LAYER_ID = 'locator-radius-line';

const METERS_PER_MILE = 1609.34;
// Mean Earth radius — the value Leaflet's L.Circle uses, so a radius indicator
// covers the same ground in both renderers.
const EARTH_RADIUS_M = 6371008.8;

function toLngLat(latLng) {
    return [latLng[1], latLng[0]];
}

function isLatLng(value) {
    return Array.isArray(value) && value.length === 2
        && typeof value[0] === 'number' && typeof value[1] === 'number';
}

// A true metric circle as a GeoJSON polygon. mapbox-gl's own `circle` layer is
// sized in screen pixels, which would grow and shrink against the ground as the
// visitor zooms; the radius indicator has to mean a fixed number of miles.
function circleFeature([lat, lng], radiusMeters, steps = 128) {
    const coordinates = [];
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const angular = radiusMeters / EARTH_RADIUS_M;

    for (let i = 0; i <= steps; i += 1) {
        const bearing = (i / steps) * 2 * Math.PI;
        const lat2 = Math.asin(
            Math.sin(latRad) * Math.cos(angular)
            + Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing),
        );
        const lng2 = lngRad + Math.atan2(
            Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
            Math.cos(angular) - Math.sin(latRad) * Math.sin(lat2),
        );
        coordinates.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
    }

    return {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [coordinates] },
    };
}

const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] };

export default function LocatorMapbox({
    locations = [],
    center,
    recenterCenter = null,
    zoom = 10,
    defaultCenter = null,
    radiusMiles,
    showPinNumber = false,
    pinColor = '#185FA5',
    pinSize = 'small',
    pinTextColor,
    pinTextSize,
    pinType = 'standard',
    pinImage = '',
    activeId = null,
    focusedZoom = false,
    dynamicSearch = true,
    onMove = () => {},
    onSelect = () => {},
    renderPopup = null,
    // Mapbox-specific: the access token (injected server-side per locator) and
    // the locator's normalised map-library selection.
    mapboxToken = '',
    mapboxSelection = null,
}) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const glRef = useRef(null);
    // Result markers and their popup React roots, keyed by location id.
    const markersRef = useRef(new Map());
    // The draggable search-center marker (dynamic search off only).
    const personMarkerRef = useRef(null);
    // Timestamp (ms) until which map move/zoom events are treated as
    // programmatic (our zoom-to-pin animation) and must not trigger a search.
    const programmaticUntil = useRef(0);
    // The library and the map instance arrive asynchronously, so every effect
    // that touches them waits on `mapReady` rather than firing on first render
    // and never again.
    const [mapReady, setMapReady] = useState(false);
    // Whether the current style has finished loading. Sources and layers can
    // only be added to a loaded style, and setStyle() discards them, so the
    // radius circle is (re)installed off the back of this.
    const [styleReady, setStyleReady] = useState(false);
    const [failed, setFailed] = useState('');

    // Handlers and render functions are read through refs so the map is created
    // exactly once: rebinding listeners on every parent render would tear down
    // and rebuild the map while the visitor is panning it.
    const onMoveRef = useRef(onMove);
    const onSelectRef = useRef(onSelect);
    const renderPopupRef = useRef(renderPopup);
    const styleRef = useRef(null);
    const configRef = useRef(null);
    const navControlRef = useRef(null);
    onMoveRef.current = onMove;
    onSelectRef.current = onSelect;
    renderPopupRef.current = renderPopup;

    // Memoised on the selection's primitive fields, not the object: <Locator />
    // rebuilds `mapboxSelection` on every render, and a pasted style document
    // resolves to a fresh object each time — keying off the object identity
    // would call setStyle() on every keystroke in the search box.
    // Depending on the object itself is the bug this avoids, and these three
    // fields are everything resolveMapboxStyle reads.
    const style = useMemo(
        () => resolveMapboxStyle(mapboxSelection ?? {}),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            mapboxSelection?.mapbox_style_source,
            mapboxSelection?.mapbox_style,
            mapboxSelection?.mapbox_custom_json,
        ],
    );
    // The map is built asynchronously (the library has to arrive first), so the
    // constructor reads the style through a ref: a selection changed while
    // mapbox-gl was still downloading would otherwise boot the stale one and
    // never be corrected, since the setStyle effect below fires before there is
    // a map to call it on.
    // Mapbox Standard's colour variants (Dawn/Dusk/Night, Faded, Monochrome) are
    // runtime *config* on one style URL rather than separate styles, so several
    // options resolve to the same `style` and differ only here.
    const config = useMemo(
        () => resolveMapboxConfig(mapboxSelection ?? {}),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [mapboxSelection?.mapbox_style_source, mapboxSelection?.mapbox_style],
    );
    styleRef.current = style;
    configRef.current = config;

    // 3D tilts the camera and hands the visitor rotate/pitch controls. Off is
    // the flat, top-down map the locator has always been.
    const is3d = mapboxSelection?.mapbox_3d === true;
    const is3dRef = useRef(is3d);
    is3dRef.current = is3d;

    // Freeze the map's initial view once, exactly as LocatorMap does; later
    // changes flow through the recenter effect. Priority: an active search
    // center, then the locator's configured country (used when auto-detect is
    // off), then the world fallback.
    const [initialView] = useState(() => {
        if (isLatLng(center)) return { center, zoom };
        if (isLatLng(defaultCenter)) return { center: defaultCenter, zoom };
        return { center: [39.8283, -98.5795], zoom: 4 };
    });

    // ---- Map lifecycle ----------------------------------------------------
    useEffect(() => {
        let cancelled = false;
        const container = containerRef.current;
        if (!container || !mapboxToken) return undefined;

        loadMapboxGl().then((mapboxgl) => {
            if (cancelled || !containerRef.current) return;

            mapboxgl.accessToken = mapboxToken;
            glRef.current = mapboxgl;

            const map = new mapboxgl.Map({
                container: containerRef.current,
                style: styleRef.current,
                ...(configRef.current
                    ? { config: { [MAPBOX_CONFIG_IMPORT_ID]: configRef.current } }
                    : {}),
                center: toLngLat(initialView.center),
                zoom: initialView.zoom,
                // Mapbox's terms require the wordmark and attribution to stay
                // visible, so — unlike the keyless Leaflet tiles, where
                // LocatorMap turns attribution off — these controls stay on.
                attributionControl: true,
                // Without 3D a store locator is a flat, top-down map: letting
                // visitors tilt or spin it only makes the pins harder to read.
                // maxPitch is what enforces that — the handlers below cover
                // drag and touch, but keyboard tilt ignores them.
                pitch: is3dRef.current ? MAPBOX_3D_PITCH : 0,
                maxPitch: is3dRef.current ? MAPBOX_3D_MAX_PITCH : 0,
                pitchWithRotate: is3dRef.current,
                dragRotate: is3dRef.current,
                touchPitch: is3dRef.current,
            });
            if (!is3dRef.current) map.touchZoomRotate?.disableRotation();
            // Matches the zoom control Leaflet renders by default (top-left).
            // In 3D the compass comes with it, so a visitor who has rotated or
            // tilted the map has a way back to north and level.
            navControlRef.current = new mapboxgl.NavigationControl({
                showCompass: is3dRef.current,
                visualizePitch: is3dRef.current,
            });
            map.addControl(navControlRef.current, 'top-left');

            map.on('style.load', () => setStyleReady(true));
            map.on('error', (event) => {
                // Style/tile errors are reported here rather than thrown. Keep
                // them visible in the console but never break the page.
                if (event?.error) console.error('[locator] mapbox-gl:', event.error);
            });

            const report = () => {
                if (Date.now() < programmaticUntil.current) return;
                const c = map.getCenter();
                onMoveRef.current({ lat: c.lat, lng: c.lng }, map.getZoom());
            };
            map.on('dragend', report);
            map.on('zoomend', report);

            mapRef.current = map;
            setMapReady(true);
        }).catch((error) => {
            if (cancelled) return;
            console.error('[locator] mapbox-gl failed to load:', error);
            setFailed('The map could not be loaded.');
        });

        return () => {
            cancelled = true;
            for (const { root, popupEl } of markersRef.current.values()) {
                if (root) queueMicrotask(() => root.unmount());
                popupEl?.remove();
            }
            markersRef.current.clear();
            personMarkerRef.current = null;
            mapRef.current?.remove();
            mapRef.current = null;
            setMapReady(false);
            setStyleReady(false);
        };
        // The map is created once. `style` changes are applied by setStyle in
        // the effect below rather than by rebuilding the map, and initialView
        // is frozen state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapboxToken]);

    // Switching template / custom JSON swaps the style in place. The visitor's
    // current center and zoom survive, and `style.load` re-adds the radius.
    //
    // `applied` tracks what the map is actually showing so a change of Standard
    // variant — same URL, different config — updates the config in place instead
    // of reloading the style. That is near-instant and, unlike setStyle, does
    // not tear down and re-add the radius layer.
    const applied = useRef({ style: null, config: null });
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const first = applied.current.style === null;
        const styleChanged = !first && applied.current.style !== style;
        applied.current = { style, config };

        // The constructor already applied both on first run.
        if (first) return;

        if (styleChanged) {
            setStyleReady(false);
            map.setStyle(style, config ? { config: { [MAPBOX_CONFIG_IMPORT_ID]: config } } : undefined);
            return;
        }
        if (!config) return;
        // Same style, different knobs. Every variant carries the full set, so
        // this also resets whatever the previous variant had changed.
        for (const [key, value] of Object.entries(config)) {
            map.setConfigProperty(MAPBOX_CONFIG_IMPORT_ID, key, value);
        }
    }, [style, config, mapReady]);

    // Toggling 3D from the customize sidebar has to take effect on the live map,
    // not just on the next mount: tilt the camera, hand over (or take back) the
    // rotate/pitch handlers, and swap the compass in or out of the zoom control.
    const applied3d = useRef(null);
    useEffect(() => {
        const map = mapRef.current;
        const mapboxgl = glRef.current;
        if (!map || !mapboxgl) return;

        // The constructor already built the map in the right mode, so the first
        // run only records it — otherwise every load would animate a needless
        // easeTo and rebuild the zoom control.
        const first = applied3d.current === null;
        applied3d.current = is3d;
        if (first) return;

        // Raise the ceiling before tilting and lower it after levelling out, so
        // neither call is clamped by the other.
        if (is3d) {
            map.setMaxPitch(MAPBOX_3D_MAX_PITCH);
            map.dragRotate?.enable();
            map.touchZoomRotate?.enableRotation();
            map.touchPitch?.enable();
        }

        // Our own move, so it must not kick off a search around the new centre.
        programmaticUntil.current = Date.now() + 1200;
        map.easeTo({
            pitch: is3d ? MAPBOX_3D_PITCH : 0,
            // Going flat also squares the map back up to north; any rotation the
            // visitor applied in 3D would otherwise be stuck there with no
            // compass left to undo it.
            ...(is3d ? {} : { bearing: 0 }),
            duration: 400,
        });

        if (!is3d) {
            map.dragRotate?.disable();
            map.touchZoomRotate?.disableRotation();
            map.touchPitch?.disable();
            // easeTo is animated, so the ceiling can only drop once it lands.
            map.once('moveend', () => mapRef.current?.setMaxPitch(0));
        }

        // NavigationControl takes showCompass at construction only.
        if (navControlRef.current) map.removeControl(navControlRef.current);
        navControlRef.current = new mapboxgl.NavigationControl({
            showCompass: is3d,
            visualizePitch: is3d,
        });
        map.addControl(navControlRef.current, 'top-left');
    }, [is3d, mapReady]);

    // mapbox-gl sizes its canvas once and never watches the container, so the
    // customize screen's desktop/mobile toggle (and any responsive reflow)
    // would otherwise leave a stretched or clipped map.
    useEffect(() => {
        const container = containerRef.current;
        if (!container || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(() => mapRef.current?.resize());
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // ---- Radius indicator -------------------------------------------------
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !styleReady) return;

        const data = isLatLng(center) && radiusMiles > 0
            ? circleFeature(center, radiusMiles * METERS_PER_MILE)
            : EMPTY_COLLECTION;

        const existing = map.getSource(RADIUS_SOURCE_ID);
        if (existing) {
            existing.setData(data);
            map.setPaintProperty(RADIUS_FILL_LAYER_ID, 'fill-color', pinColor);
            map.setPaintProperty(RADIUS_LINE_LAYER_ID, 'line-color', pinColor);
            return;
        }

        map.addSource(RADIUS_SOURCE_ID, { type: 'geojson', data });
        // Mirrors LocatorMap's <Circle>: a 6% brand-colour wash with a 1px edge.
        map.addLayer({
            id: RADIUS_FILL_LAYER_ID,
            type: 'fill',
            source: RADIUS_SOURCE_ID,
            paint: { 'fill-color': pinColor, 'fill-opacity': 0.06 },
        });
        map.addLayer({
            id: RADIUS_LINE_LAYER_ID,
            type: 'line',
            source: RADIUS_SOURCE_ID,
            paint: { 'line-color': pinColor, 'line-width': 1 },
        });
    }, [center, radiusMiles, pinColor, styleReady]);

    // ---- Result markers ---------------------------------------------------
    // Markers live outside the style, so they survive setStyle and are rebuilt
    // only when the results or the pin appearance actually change.
    useEffect(() => {
        const map = mapRef.current;
        const mapboxgl = glRef.current;
        if (!map || !mapboxgl) return;

        const next = new Map();
        const plottable = locations.filter(
            (loc) => typeof loc.latitude === 'number' && typeof loc.longitude === 'number',
        );

        plottable.forEach((loc, index) => {
            const icon = iconForLocation(loc, index, {
                showPinNumber, pinColor, pinSize, pinTextColor, pinTextSize, pinType, pinImage,
            });

            // Two nested elements on purpose. mapbox-gl takes ownership of the
            // outer one — it writes `transform` and, in v3, `opacity` (markers
            // fade as the globe rotates them past the horizon or terrain hides
            // them) — so the selection dimming has to live on an inner wrapper
            // the library never touches.
            const el = document.createElement('div');
            // Mirrors the store list's `key`, so a marker can be traced back to
            // its result when debugging or driving the map from a test.
            el.dataset.locationId = loc._id;
            el.style.width = `${icon.width}px`;
            el.style.height = `${icon.height}px`;
            el.style.cursor = 'pointer';

            const inner = document.createElement('div');
            inner.style.width = '100%';
            inner.style.height = '100%';
            inner.innerHTML = icon.html;
            el.appendChild(inner);

            // The popup's React content is rendered lazily on first open and
            // refreshed while it stays open (see the effect below), so a list of
            // results costs one React root each only once opened.
            const popupEl = document.createElement('div');
            popupEl.className = 'locator-popup-card';
            const popup = new mapboxgl.Popup({
                offset: [0, -icon.height],
                maxWidth: '300px',
                closeButton: true,
            }).setDOMContent(popupEl);

            const entry = { loc, index, popup, popupEl, el, inner, root: null, open: false, panAttempts: 0 };
            popup.on('open', () => {
                entry.open = true;
                entry.panAttempts = 0;
                renderPopupContent(entry);
                // React has to lay the card out before its height is known.
                requestAnimationFrame(() => panPopupIntoView(entry));
            });
            popup.on('close', () => { entry.open = false; });

            const marker = new mapboxgl.Marker({
                element: el,
                // mapbox-gl anchors from the element's center by default; shift
                // by the shared icon geometry so the teardrop's tip — not its
                // middle — sits on the coordinate.
                offset: [icon.width / 2 - icon.anchorX, icon.height / 2 - icon.anchorY],
            })
                .setLngLat([loc.longitude, loc.latitude])
                .setPopup(popup)
                .addTo(map);

            el.addEventListener('click', () => onSelectRef.current(loc._id));

            entry.marker = marker;
            next.set(loc._id, entry);
        });

        // Swap in the new set, then tear down the old one.
        const previous = markersRef.current;
        markersRef.current = next;
        for (const entry of previous.values()) {
            entry.marker?.remove();
            // React forbids unmounting a root while it is rendering, which this
            // effect can be inside of; defer past the current task.
            if (entry.root) {
                const { root } = entry;
                queueMicrotask(() => root.unmount());
            }
            entry.popupEl?.remove();
        }

        return undefined;
        // renderPopupContent / panPopupIntoView are deliberately absent: both
        // are rebuilt on every render, and depending on them would tear down and
        // recreate all 50-odd markers on each one. They only ever read from
        // refs, so the versions captured here stay correct.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, locations, showPinNumber, pinColor, pinSize, pinTextColor, pinTextSize, pinType, pinImage]);

    function renderPopupContent(entry) {
        const render = renderPopupRef.current;
        if (!render) return;
        if (!entry.root) entry.root = createRoot(entry.popupEl);
        entry.root.render(render(entry.loc, entry.index));
    }

    // Leaflet's popups auto-pan themselves into view; mapbox-gl's do not, which
    // left a card opened near an edge clipped by the map frame. Nudge the map by
    // however much of the bubble sits outside it — nothing at all when it
    // already fits, so a popup in open space never makes the map jump.
    //
    // It corrects iteratively rather than in one shot: under the globe
    // projection the Standard style uses, a pixel offset does not translate to
    // the same number of pixels of apparent movement, so a single panBy
    // undershoots near the frame edge.
    const PAN_PADDING = 12;
    const PAN_MAX_ATTEMPTS = 4;

    function panPopupIntoView(entry) {
        const map = mapRef.current;
        if (!map || !entry.open) return;
        if (entry.panAttempts >= PAN_MAX_ATTEMPTS) return;

        // Selecting a result also starts the focus-zoom flyTo. Correcting
        // mid-flight would be undone the moment it lands, so wait for the
        // camera to settle first.
        if (map.isMoving() || map.isEasing()) {
            map.once('moveend', () => panPopupIntoView(entry));
            return;
        }

        const bubble = entry.popupEl?.closest('.mapboxgl-popup');
        if (!bubble) return;

        const frame = map.getContainer().getBoundingClientRect();
        const card = bubble.getBoundingClientRect();

        // Positive dx/dy pans the camera right/down, which moves the map's
        // content — and the popup anchored to it — left/up.
        let dx = 0;
        let dy = 0;
        if (card.left < frame.left + PAN_PADDING) dx = card.left - frame.left - PAN_PADDING;
        else if (card.right > frame.right - PAN_PADDING) dx = card.right - frame.right + PAN_PADDING;
        if (card.top < frame.top + PAN_PADDING) dy = card.top - frame.top - PAN_PADDING;
        else if (card.bottom > frame.bottom - PAN_PADDING) dy = card.bottom - frame.bottom + PAN_PADDING;
        // Sub-pixel remainders aren't worth another animation.
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

        entry.panAttempts += 1;
        // Our own move, so it must not kick off a search around the new centre.
        programmaticUntil.current = Date.now() + 1000;
        map.panBy([dx, dy], { duration: 150 });
        map.once('moveend', () => panPopupIntoView(entry));
    }

    // Keep whichever popup is open in step with the parent's state — the store
    // hours toggle, the open/closed badge's minute tick, a settings change in
    // the customize sidebar. Deliberately dependency-free: `renderPopup` is
    // rebuilt on every parent render, so "after every render" is exactly the
    // right cadence, and only the single open popup is touched.
    useEffect(() => {
        for (const entry of markersRef.current.values()) {
            if (entry.open) renderPopupContent(entry);
        }
    });

    // Dim the results that aren't selected, mirroring LocatorMap's marker
    // `opacity`, and open the active location's popup.
    useEffect(() => {
        for (const [id, entry] of markersRef.current.entries()) {
            // `entry.inner`, not the marker element: mapbox-gl writes
            // element.style.opacity itself every frame (globe/terrain occlusion
            // fading), so anything we set there is overwritten within a frame.
            entry.inner.style.opacity = activeId && activeId !== id ? '0.6' : '1';
        }
        if (!activeId) return;
        const entry = markersRef.current.get(activeId);
        if (entry && !entry.popup.isOpen()) entry.marker.togglePopup();
    }, [mapReady, activeId, locations]);

    // ---- View control -----------------------------------------------------
    // Recenters whenever a new search center arrives from the parent
    // (text-search geocode result or geolocation). `lastApplied` means a
    // zoom-only change can't snap the map back to a stale center mid-pan.
    const lastApplied = useRef(null);
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isLatLng(recenterCenter)) return;
        const [lat, lng] = recenterCenter;
        const previous = lastApplied.current;
        if (previous && previous[0] === lat && previous[1] === lng) return;
        lastApplied.current = [lat, lng];
        // Programmatic — jumpTo still fires moveend, so keep the search from
        // firing back at us.
        programmaticUntil.current = Date.now() + 1000;
        map.jumpTo({ center: [lng, lat], zoom: zoom ?? map.getZoom() });
    }, [mapReady, recenterCenter, zoom]);

    // Zooms in on the active location whenever a result is selected — by
    // clicking its pin or its entry in the store list.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !focusedZoom || !activeId) return;
        const loc = locations.find((l) => l._id === activeId);
        if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return;
        programmaticUntil.current = Date.now() + 1500;
        map.flyTo({
            center: [loc.longitude, loc.latitude],
            zoom: Math.min(16, map.getMaxZoom()),
            duration: 600,
        });
    }, [mapReady, activeId, locations, focusedZoom]);

    // With dynamic search on, panning/zooming auto-searches around the new
    // viewport center (wired up at map creation). With it off, moving the map
    // searches nothing and this draggable person marker is the only way to move
    // the search center.
    useEffect(() => {
        const map = mapRef.current;
        const mapboxgl = glRef.current;
        if (!map || !mapboxgl) return undefined;

        if (dynamicSearch) {
            personMarkerRef.current?.remove();
            personMarkerRef.current = null;
            return undefined;
        }

        const icon = personIcon();
        const el = document.createElement('div');
        el.style.width = `${icon.width}px`;
        el.style.height = `${icon.height}px`;
        el.innerHTML = icon.html;
        el.dataset.searchCenter = 'true';

        // Seeded from the map's current view when no search center exists yet
        // (e.g. the country-only default load returns none).
        const seed = isLatLng(center) ? [center[1], center[0]] : map.getCenter().toArray();
        const marker = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat(seed)
            .addTo(map);

        marker.on('dragend', () => {
            const p = marker.getLngLat();
            onMoveRef.current({ lat: p.lat, lng: p.lng }, map.getZoom());
        });

        personMarkerRef.current?.remove();
        personMarkerRef.current = marker;
        return () => {
            marker.remove();
            if (personMarkerRef.current === marker) personMarkerRef.current = null;
        };
        // Keyed on `center` the way LocatorMap remounts <SearchCenterMarker>, so
        // every new search center puts the marker back on the search it made.
    }, [mapReady, dynamicSearch, center]);

    if (!mapboxToken) {
        // The token is injected per locator, and only for a plan allowed to use
        // Mapbox. Missing means misconfiguration, not a visitor problem.
        return <div className="map-loading">Mapbox is not configured for this locator.</div>;
    }

    return (
        <>
            <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
            {/* Overlaid rather than rendered in place of the container: the ref
                has to stay mounted for the effect above to clean up after
                itself. .locator-map is the positioned ancestor. */}
            {failed && (
                <div className="map-loading" style={{ position: 'absolute', inset: 0, background: '#fff' }}>
                    {failed}
                </div>
            )}
        </>
    );
}
