'use client';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

// Circle radius (in pixels) scaled by a cluster's share of the busiest cluster,
// so the largest cluster is prominent while the smallest stays legible.
const MIN_RADIUS = 10;
const MAX_RADIUS = 34;
function radiusFor(count, maxCount) {
    if (!maxCount) return MIN_RADIUS;
    const ratio = Math.sqrt(count / maxCount); // sqrt so area ~ volume
    return MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS);
}

// Brand yellow→orange ramp mirroring the rest of the analytics dashboard.
function colorFor(count, maxCount) {
    if (!maxCount) return '#fff3cc';
    const ratio = count / maxCount;
    if (ratio > 0.75) return '#BA7517';
    if (ratio > 0.4) return '#f5c800';
    if (ratio > 0.15) return '#ffe54c';
    return '#fff3cc';
}

// Fits the viewport to all clusters once they are known, so the map always
// frames the data regardless of how spread out the clusters are.
function FitToClusters({ clusters }) {
    const map = useMap();
    useEffect(() => {
        if (!clusters.length) return;
        if (clusters.length === 1) {
            map.setView([clusters[0].lat, clusters[0].lng], 8);
            return;
        }
        const bounds = clusters.map((c) => [c.lat, c.lng]);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 });
    }, [clusters, map]);
    return null;
}

export default function GeoClusterMapInner({ clusters = [], center = [12.8797, 121.774], zoom = 5 }) {
    // Only plot clusters with valid numeric coordinates — searches whose
    // geo_label never resolved to lat/lng would otherwise crash the markers.
    const validClusters = clusters.filter(
        (c) => Number.isFinite(c?.lat) && Number.isFinite(c?.lng)
    );
    const maxCount = validClusters.reduce((m, c) => Math.max(m, c.count || 0), 0);

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                attribution="&copy; OpenStreetMap"
                maxZoom={19}
            />
            <FitToClusters clusters={validClusters} />
            {validClusters.map((c) => (
                <CircleMarker
                    key={`${c.lat},${c.lng}`}
                    center={[c.lat, c.lng]}
                    radius={radiusFor(c.count, maxCount)}
                    pathOptions={{
                        color: '#fff',
                        weight: 1.5,
                        fillColor: colorFor(c.count, maxCount),
                        fillOpacity: 0.85,
                    }}
                >
                    <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                        {c.title ?? `${c.name}: ${c.count?.toLocaleString?.() ?? c.count} searches`}
                    </Tooltip>
                </CircleMarker>
            ))}
        </MapContainer>
    );
}
