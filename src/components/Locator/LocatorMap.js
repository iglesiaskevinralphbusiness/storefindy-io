'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
    activeId = null,
    focusedZoom = false,
    onMove = () => {},
    onSelect = () => {},
    renderPopup = null,
}) {
    const icon = useMemo(() => buildPinIcon(pinColor, pinSize), [pinColor, pinSize]);
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
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                attribution="&copy; OpenStreetMap"
                maxZoom={19}
            />

            <Recenter center={recenterCenter} zoom={zoom} />
            <MoveHandler onMove={onMove} programmaticUntil={programmaticUntil} />
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
                return (
                    <Marker
                        key={loc._id}
                        ref={(instance) => { if (instance) markerRefs.current[loc._id] = instance; }}
                        position={[loc.latitude, loc.longitude]}
                        icon={
                            useCustomImage
                                ? buildCustomImageIcon(pinImage, pinSize, showPinNumber ? index + 1 : null, pinTextColor, pinTextSize)
                                : showPinNumber
                                    ? buildNumberedPinIcon(pinColor, index + 1, pinSize, pinTextColor, pinTextSize)
                                    : icon
                        }
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
