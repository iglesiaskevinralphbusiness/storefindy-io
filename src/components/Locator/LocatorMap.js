'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveMapStyle } from '@/utils/constant/map-styles';
import { iconForLocation, personIcon, pinIcon } from './pin-icons';

// Wraps one of the shared marker definitions (see ./pin-icons.js, also used by
// LocatorMapbox) in the L.divIcon Leaflet needs. `popupAnchor` is relative to
// the icon anchor, so lifting the popup by the icon's height clears the marker.
function toDivIcon({ html, width, height, anchorX, anchorY }) {
    return L.divIcon({
        className: '',
        html,
        iconSize: [width, height],
        iconAnchor: [anchorX, anchorY],
        popupAnchor: [0, -height],
    });
}

// Recenters the map whenever a new search center arrives from the parent
// (text-search geocode result or geolocation). Programmatic moves like this do
// NOT fire the `dragend`/`zoomend` events used for auto-search, so there is no
// feedback loop.
function Recenter({ center, zoom }) {
    const map = useMap();
    // Track the last center we applied so a zoom-only change (e.g. the parent's
    // setZoom after a map drag) can't re-trigger setView and snap the map back
    // to a stale center while the user is panning.
    const lastApplied = useRef(null);
    useEffect(() => {
        if (!center || center.length !== 2) return;
        const [lat, lng] = center;
        const prev = lastApplied.current;
        if (prev && prev[0] === lat && prev[1] === lng) return;
        lastApplied.current = [lat, lng];
        map.setView(center, zoom ?? map.getZoom());
    }, [center, zoom, map]);
    return null;
}

// Reports the map center back to the parent after the user pans or zooms, so
// the parent can re-run the search around the new viewport center.
// `programmaticUntil` suppresses events fired by our own zoom-to-pin animation
// (see <FocusActive />) so focusing a result doesn't kick off a fresh search.
function MoveHandler({ onMove, programmaticUntil }) {
    const map = useMap();
    const isProgrammatic = () => Date.now() < (programmaticUntil?.current ?? 0);
    useMapEvents({
        dragend() {
            if (isProgrammatic()) return;
            const c = map.getCenter();
            onMove({ lat: c.lat, lng: c.lng }, map.getZoom());
        },
        zoomend() {
            if (isProgrammatic()) return;
            const c = map.getCenter();
            onMove({ lat: c.lat, lng: c.lng }, map.getZoom());
        },
    });
    return null;
}

// The person marker standing on the map's current search center, shown only when
// dynamic search is off. In that mode panning the map never searches, so this
// marker is how the visitor moves the search: they drag it somewhere else and
// the search re-runs around wherever it was dropped.
// The parent keys this component on `center`, so every new search center
// (text search, geolocation, the search a drop itself triggered) remounts it at
// that point — the marker and the search center can never disagree.
function SearchCenterMarker({ center, icon, onDrop }) {
    const map = useMap();
    // Its own position, so a drag leaves it where it was dropped even before the
    // search comes back. Seeded from the map's current view when no search
    // center exists yet (e.g. the country-only default load returns none).
    const [position, setPosition] = useState(() => {
        if (center && center.length === 2) return center;
        const c = map.getCenter();
        return [c.lat, c.lng];
    });
    return (
        <Marker
            position={position}
            icon={icon}
            draggable={true}
            // Keep it above the location pins and the radius circle.
            zIndexOffset={1000}
            eventHandlers={{
                dragend(e) {
                    const p = e.target.getLatLng();
                    setPosition([p.lat, p.lng]);
                    onDrop({ lat: p.lat, lng: p.lng }, map.getZoom());
                },
            }}
        />
    );
}

// Zooms the map in on the active location whenever a result is selected — by
// clicking its pin or its entry in the store list. We mark the move as
// programmatic so MoveHandler ignores the resulting zoom/move events.
function FocusActive({ activeId, locations, zoom = 18, programmaticUntil }) {
    const map = useMap();
    useEffect(() => {
        if (!activeId) return;
        const loc = locations.find((l) => l._id === activeId);
        if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return;
        if (programmaticUntil) programmaticUntil.current = Date.now() + 1500;
        const targetZoom = Math.min(zoom, map.getMaxZoom());
        map.flyTo([loc.latitude, loc.longitude], targetZoom, { duration: 0.6 });
    }, [activeId, locations, zoom, map, programmaticUntil]);
    return null;
}

// Keeps the map's zoom ceiling in lockstep with the current tile style, so
// switching to a style that has fewer native zoom levels cannot overshoot
// into stretched tiles or Esri's "Map data not yet available" placeholder.
function SyncMaxZoom({ maxZoom }) {
    const map = useMap();
    useEffect(() => {
        const cap = Number.isFinite(maxZoom) ? maxZoom : 18;
        map.setMaxZoom(cap);
        if (map.getZoom() > cap) map.setZoom(cap);
    }, [map, maxZoom]);
    return null;
}

export default function LocatorMap({
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
    mapStyle = '',
    activeId = null,
    focusedZoom = false,
    dynamicSearch = true,
    onMove = () => {},
    onSelect = () => {},
    renderPopup = null,
}) {
    const icon = useMemo(() => toDivIcon(pinIcon(pinColor, pinSize)), [pinColor, pinSize]);
    // The configured base map (settings' `map_style`). An empty/unknown value
    // resolves to the default Voyager tiles the map has always used.
    const tiles = useMemo(() => resolveMapStyle(mapStyle), [mapStyle]);
    // The draggable search-center marker (dynamic search off only).
    const personMarkerIcon = useMemo(() => toDivIcon(personIcon()), []);
    // Leaflet marker instances, keyed by location id, so the active one's popup
    // can be opened programmatically when an item is selected in the list.
    const markerRefs = useRef({});
    // Timestamp (ms) until which map move/zoom events are treated as
    // programmatic (our zoom-to-pin animation) and must not trigger a search.
    const programmaticUntil = useRef(0);

    useEffect(() => {
        if (activeId && markerRefs.current[activeId]) {
            markerRefs.current[activeId].openPopup();
        }
    }, [activeId]);

    // Freeze the map's initial view once; later changes flow through <Recenter />.
    // Priority: an active search center, then the locator's configured country
    // (used when auto-detect is off), then the world fallback.
    const [initialView] = useState(() => {
        if (center && center.length === 2) return { center, zoom };
        if (defaultCenter && defaultCenter.length === 2) return { center: defaultCenter, zoom };
        return { center: [39.8283, -98.5795], zoom: 4 };
    });

    return (
        <MapContainer
            center={initialView.center}
            zoom={initialView.zoom}
            maxZoom={tiles.maxZoom}
            scrollWheelZoom={true}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
        >
            <SyncMaxZoom maxZoom={tiles.maxZoom} />
            {/* Keyed on the style code so switching styles remounts the layer:
                react-leaflet only makes `url` reactive, so `subdomains` and
                `maxZoom` would otherwise keep the previous style's values.
                `labelsUrl` is an optional transparent overlay (city names)
                drawn above the base but below markers. */}
            <TileLayer
                key={`${tiles.code}-base`}
                url={tiles.url}
                subdomains={tiles.subdomains || 'abc'}
                attribution={tiles.attribution}
                maxZoom={tiles.maxZoom}
                maxNativeZoom={tiles.maxNativeZoom ?? tiles.maxZoom}
                zIndex={1}
            />
            {tiles.overlayUrl ? (
                <TileLayer
                    key={`${tiles.code}-overlay`}
                    url={tiles.overlayUrl}
                    subdomains={tiles.subdomains || 'abc'}
                    attribution=""
                    maxZoom={tiles.maxZoom}
                    maxNativeZoom={tiles.maxNativeZoom ?? tiles.maxZoom}
                    zIndex={2}
                />
            ) : null}
            {tiles.labelsUrl ? (
                <TileLayer
                    key={`${tiles.code}-labels`}
                    url={tiles.labelsUrl}
                    subdomains={tiles.subdomains || 'abc'}
                    attribution=""
                    maxZoom={tiles.maxZoom}
                    maxNativeZoom={tiles.maxNativeZoom ?? tiles.maxZoom}
                    zIndex={3}
                />
            ) : null}

            <Recenter center={recenterCenter} zoom={zoom} />
            {/* With dynamic search on, panning/zooming the map auto-searches
                around the new viewport center. With it off, moving the map
                searches nothing at all — the draggable person marker is then the
                only way to move the search center. */}
            {dynamicSearch ? (
                <MoveHandler onMove={onMove} programmaticUntil={programmaticUntil} />
            ) : (
                <SearchCenterMarker
                    key={center && center.length === 2 ? `${center[0]},${center[1]}` : 'initial'}
                    center={center}
                    icon={personMarkerIcon}
                    onDrop={onMove}
                />
            )}
            {focusedZoom && (
                <FocusActive activeId={activeId} locations={locations} zoom={16} programmaticUntil={programmaticUntil} />
            )}

            {center && radiusMiles > 0 && (
                <Circle
                    center={center}
                    radius={radiusMiles * 1609.34}
                    pathOptions={{ color: pinColor, fillColor: pinColor, fillOpacity: 0.06, weight: 1 }}
                />
            )}

            {locations.map((loc, index) => {
                if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return null;
                // Marker precedence (per-location icon > uploaded custom pin >
                // numbered pin > plain teardrop) lives in ./pin-icons.js so both
                // map libraries apply it identically. `icon` is the memoised
                // plain teardrop, reused when that is what wins.
                const markerIcon = showPinNumber || loc.icon || (pinType === 'custom' && pinImage)
                    ? toDivIcon(iconForLocation(loc, index, {
                        showPinNumber, pinColor, pinSize, pinTextColor, pinTextSize, pinType, pinImage,
                    }))
                    : icon;
                return (
                    <Marker
                        key={loc._id}
                        ref={(instance) => { if (instance) markerRefs.current[loc._id] = instance; }}
                        position={[loc.latitude, loc.longitude]}
                        icon={markerIcon}
                        opacity={activeId && activeId !== loc._id ? 0.6 : 1}
                        eventHandlers={{ click: () => onSelect(loc._id) }}
                    >
                        <Popup minWidth={240} maxWidth={300}>
                            <div className="locator-popup-card">
                                {renderPopup ? (
                                    renderPopup(loc, index)
                                ) : (
                                    <>
                                        <strong>{loc.name}</strong>
                                        {loc.street || loc.city ? (
                                            <div>
                                                {[loc.street, loc.city, loc.state, loc.postal].filter(Boolean).join(', ')}
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
