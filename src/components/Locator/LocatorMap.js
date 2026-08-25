'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveMapStyle } from '@/utils/constant/map-styles';

// Pixel dimensions for each configurable pin size (settings.pin.size). The
// existing default ("small") is 32px; medium and large scale up from there.
const PIN_SIZE_PX = { small: 32, medium: 44, large: 56 };
function pinPixelSize(size) {
    return PIN_SIZE_PX[size] ?? PIN_SIZE_PX.small;
}

// Builds a teardrop pin in the locator's brand color (settings.pin.color).
function buildPinIcon(color = '#185FA5', size = 'small') {
    const px = pinPixelSize(size);
    return L.divIcon({
        className: '',
        html: `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
        iconSize: [px, px],
        iconAnchor: [px / 2, px],
        popupAnchor: [0, -px],
    });
}

// Builds a pin from a user-uploaded image (settings.pin.image, a data URL) used
// when the locator's pin type is "custom". The image is centered on the
// location and scaled to the configured pin size. When `number` is provided
// (i.e. "Show pin number" is on), it is rendered as a badge on top of the image
// so the marker still mirrors the store list's ordinal.
function buildCustomImageIcon(image, size = 'small', number, textColor, textSize) {
    const px = pinPixelSize(size);
    const img = `<img src="${image}" width="${px}" height="${px}" style="width:${px}px;height:${px}px;object-fit:contain;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))" alt="" />`;
    let badge = '';
    if (number != null) {
        const fill = textColor || '#fff';
        const fontPx = Number(textSize) > 0 ? Number(textSize) : 12;
        badge = `<span style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:bold;font-size:${fontPx}px;color:${fill};text-shadow:0 1px 2px rgba(0,0,0,0.5);pointer-events:none">${number}</span>`;
    }
    return L.divIcon({
        className: '',
        html: `<div style="position:relative;width:${px}px;height:${px}px">${img}${badge}</div>`,
        iconSize: [px, px],
        // Anchor at the bottom-center so the image sits at the same point as the
        // standard teardrop pin (whose tip marks the location), rather than
        // centered (which made it appear lower).
        iconAnchor: [px / 2, px],
        popupAnchor: [0, -px],
    });
}

// Builds a numbered pin that mirrors the store list's ordinal (index + 1), so a
// result's position in the list matches its marker on the map. textColor /
// textSize fall back to #fff / 14px when their settings are empty.
function buildNumberedPinIcon(color = '#185FA5', number, size = 'small', textColor, textSize) {
    const px = pinPixelSize(size);
    const fill = textColor || '#fff';
    const fontPx = Number(textSize) > 0 ? Number(textSize) : 14;
    // The SVG is drawn in a 24-unit viewBox scaled to `px`, so convert the
    // desired pixel font size back into viewBox units.
    const fontUnits = (fontPx * 24) / px;
    return L.divIcon({
        className: '',
        html: `<svg width="${px}" height="${px}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}"/><text x="12" y="9" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="${fontUnits}" font-weight="bold" fill="${fill}">${number}</text></svg>`,
        iconSize: [px, px],
        iconAnchor: [px / 2, px],
        popupAnchor: [0, -px],
    });
}

// The draggable "search from here" person marker is a fixed size — it is a
// control rather than a result pin, so it deliberately ignores settings.pin.size.
// The hit area the glyph is centered in; the box itself draws nothing.
const PERSON_ICON_W = 28;
const PERSON_ICON_H = 33;
const PERSON_GLYPH_PX = 20;
// The ImMan glyph is always this red, independent of the locator's pin color.
const PERSON_ICON_FILL = '#ca4940';

// The ImMan glyph from react-icons/im (its head + body paths and 16-unit
// viewBox, verbatim). Leaflet's divIcon takes an HTML string rather than a React
// node, so the paths are inlined here instead of rendering <ImMan /> — that
// keeps react-dom/server out of both the Next.js and esbuild widget bundles.
const IM_MAN_VIEWBOX = '0 0 16 16';
const IM_MAN_PATHS = [
    'M9 1.5c0 0.828-0.672 1.5-1.5 1.5s-1.5-0.672-1.5-1.5c0-0.828 0.672-1.5 1.5-1.5s1.5 0.672 1.5 1.5z',
    'M9 4h-3c-0.552 0-1 0.448-1 1v5h1v6h1.25v-6h0.5v6h1.25v-6h1v-5c0-0.552-0.448-1-1-1z',
];

// Builds the person marker that stands on the map's current search center when
// dynamic search is off. The bare ImMan glyph, centered in a transparent box
// that is a little larger than the glyph so it stays easy to grab.
function buildPersonIcon() {
    const w = PERSON_ICON_W;
    const h = PERSON_ICON_H;
    const glyphPx = PERSON_GLYPH_PX;
    const paths = IM_MAN_PATHS.map((d) => `<path d="${d}"/>`).join('');
    return L.divIcon({
        className: '',
        html: `<div title="Drag to search this area" style="box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:${w}px;height:${h}px;background:transparent;border:unset;border-radius:50%;cursor:grab"><svg width="${glyphPx}" height="${glyphPx}" viewBox="${IM_MAN_VIEWBOX}" fill="${PERSON_ICON_FILL}" xmlns="http://www.w3.org/2000/svg">${paths}</svg></div>`,
        iconSize: [w, h],
        // Centered on the coordinate rather than standing on it like the
        // teardrop pins, so the glyph sits over the point it represents.
        iconAnchor: [w / 2, h / 2],
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
        map.flyTo([loc.latitude, loc.longitude], zoom, { duration: 0.6 });
    }, [activeId, locations, zoom, map, programmaticUntil]);
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
    const icon = useMemo(() => buildPinIcon(pinColor, pinSize), [pinColor, pinSize]);
    // The configured base map (settings' `map_style`). An empty/unknown value
    // resolves to the default Voyager tiles the map has always used.
    const tiles = useMemo(() => resolveMapStyle(mapStyle), [mapStyle]);
    // The draggable search-center marker (dynamic search off only).
    const personIcon = useMemo(() => buildPersonIcon(), []);
    // When the locator uses a custom pin with an uploaded image, that image
    // replaces the teardrop shape. The number badge is still drawn on top when
    // "Show pin number" is enabled (handled per-marker below).
    const useCustomImage = pinType === 'custom' && !!pinImage;
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
            scrollWheelZoom={true}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
        >
            {/* Keyed on the style code so switching styles remounts the layer:
                react-leaflet only makes `url` reactive, so `subdomains` and
                `maxZoom` would otherwise keep the previous style's values. */}
            <TileLayer
                key={tiles.code}
                url={tiles.url}
                subdomains={tiles.subdomains || 'abc'}
                attribution={tiles.attribution}
                maxZoom={tiles.maxZoom}
            />

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
                    icon={personIcon}
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
                // A per-location icon overrides the locator pin whenever it is a
                // non-empty string. undefined / null / '' keep the locator default.
                const locationIcon = typeof loc.icon === 'string' ? loc.icon.trim() : '';
                const pinNumber = showPinNumber ? index + 1 : null;
                const markerIcon = locationIcon
                    ? buildCustomImageIcon(locationIcon, pinSize, pinNumber, pinTextColor, pinTextSize)
                    : useCustomImage
                        ? buildCustomImageIcon(pinImage, pinSize, pinNumber, pinTextColor, pinTextSize)
                        : showPinNumber
                            ? buildNumberedPinIcon(pinColor, index + 1, pinSize, pinTextColor, pinTextSize)
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
