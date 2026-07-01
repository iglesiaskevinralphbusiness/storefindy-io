'use client';
import dynamic from 'next/dynamic';

// Leaflet relies on `window`, so the map is loaded client-side only.
const GeoClusterMapInner = dynamic(() => import('./Map'), {
    ssr: false,
    loading: () => null,
});

export default function GeoClusterMap(props) {
    return <GeoClusterMapInner {...props} />;
}
