'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Builds a teardrop pin in the locator's brand color (settings.pin.color).
function buildPinIcon(color = '#185FA5') {
    return L.divIcon({
        className: '',
        html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
}

// Recenters the map whenever a new search center arrives from the parent
// (text-search geocode result or geolocation). Programmatic moves like this do
// NOT fire the `dragend`/`zoomend` events used for auto-search, so there is no
// feedback loop.
function Recenter({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center && center.length === 2) {
            map.setView(center, zoom ?? map.getZoom());
        }
    }, [center, zoom, map]);
    return null;
}

// Reports the map center back to the parent after the user pans or zooms, so
// the parent can re-run the search around the new viewport center.
function MoveHandler({ onMove }) {
    const map = useMap();
    useMapEvents({
        dragend() {
            const c = map.getCenter();
            onMove({ lat: c.lat, lng: c.lng }, map.getZoom());
        },
        zoomend() {
            const c = map.getCenter();
            onMove({ lat: c.lat, lng: c.lng }, map.getZoom());
        },
    });
    return null;
}

export default function LocatorMap({
    locations = [],
    center,
    zoom = 10,
    radiusMiles,
    pinColor = '#185FA5',
    activeId = null,
    onMove = () => {},
    onSelect = () => {},
}) {
    const icon = useMemo(() => buildPinIcon(pinColor), [pinColor]);
    // Leaflet marker instances, keyed by location id, so the active one's popup
    // can be opened programmatically when an item is selected in the list.
    const markerRefs = useRef({});

    useEffect(() => {
        if (activeId && markerRefs.current[activeId]) {
            markerRefs.current[activeId].openPopup();
        }
    }, [activeId]);

    // Freeze the map's initial view once; later changes flow through <Recenter />.
    const [initialView] = useState(() =>
        center && center.length === 2
            ? { center, zoom }
            : { center: [39.8283, -98.5795], zoom: 4 }
    );

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

            <Recenter center={center} zoom={zoom} />
            <MoveHandler onMove={onMove} />

            {center && radiusMiles > 0 && (
                <Circle
                    center={center}
                    radius={radiusMiles * 1609.34}
                    pathOptions={{ color: pinColor, fillColor: pinColor, fillOpacity: 0.06, weight: 1 }}
                />
            )}

            {locations
                .filter((loc) => typeof loc.latitude === 'number' && typeof loc.longitude === 'number')
                .map((loc) => (
                    <Marker
                        key={loc._id}
                        ref={(instance) => { if (instance) markerRefs.current[loc._id] = instance; }}
                        position={[loc.latitude, loc.longitude]}
                        icon={icon}
                        opacity={activeId && activeId !== loc._id ? 0.6 : 1}
                        eventHandlers={{ click: () => onSelect(loc._id) }}
                    >
                        <Popup>
                            <strong>{loc.name}</strong>
                            {loc.street || loc.city ? (
                                <div>
                                    {[loc.street, loc.city, loc.state, loc.postal].filter(Boolean).join(', ')}
                                </div>
                            ) : null}
                        </Popup>
                    </Marker>
                ))}
        </MapContainer>
    );
}
