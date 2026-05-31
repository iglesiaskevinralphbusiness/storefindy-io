'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pinIcon = L.divIcon({
    className: '',
    html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="#185FA5" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

function toNumber(value) {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
}

// Reports the clicked coordinates back to the parent form.
function ClickHandler({ onChange }) {
    useMapEvents({
        click(e) {
            onChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
        },
    });
    return null;
}

// Re-centers the map whenever valid coordinates arrive from inputs or geocoding.
function Recenter({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
        if (lat !== null && lng !== null) {
            map.setView([lat, lng], Math.max(map.getZoom(), 14));
        }
    }, [lat, lng, map]);
    return null;
}

// Follows the default startup center (geolocation result or fallback) until the
// user places a pin, after which Recenter takes over.
function DefaultView({ lat, lng, zoom, active }) {
    const map = useMap();
    useEffect(() => {
        if (active && lat != null && lng != null) {
            map.setView([lat, lng], zoom);
        }
    }, [lat, lng, zoom, active, map]);
    return null;
}

export default function MapPicker({ lat, lng, onChange, center = [12.8797, 121.774], zoom = 5 }) {
    const numLat = toNumber(lat);
    const numLng = toNumber(lng);
    const hasPin = numLat !== null && numLng !== null;
    const [centerLat, centerLng] = center;

    return (
        <MapContainer
            center={center}
            zoom={zoom}
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
            <ClickHandler onChange={onChange} />
            <DefaultView lat={centerLat} lng={centerLng} zoom={zoom} active={!hasPin} />
            <Recenter lat={numLat} lng={numLng} />
            {hasPin && (
                <Marker
                    position={[numLat, numLng]}
                    icon={pinIcon}
                    draggable={true}
                    eventHandlers={{
                        dragend(e) {
                            const p = e.target.getLatLng();
                            onChange(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)));
                        },
                    }}
                />
            )}
        </MapContainer>
    );
}
