'use client';
import { useState, useEffect } from 'react';
import { LuMapPin } from "react-icons/lu";
import styles from './Locators.module.scss';

// Light-only palettes adapted from the customize reference UI.
// Every entry uses a distinct hue family so two previews never share a color.
const PALETTES = [
    { mapBg: 'linear-gradient(135deg, #dce8f5 0%, #c8dff0 100%)', pinColor: '#E05C2A', dark: false }, // blue
    { mapBg: 'linear-gradient(135deg, #e8f0de 0%, #d5e8c0 100%)', pinColor: '#639922', dark: false }, // green
    { mapBg: 'linear-gradient(135deg, #dddaf5 0%, #ccc8f0 100%)', pinColor: '#534AB7', dark: false }, // purple
    { mapBg: 'linear-gradient(135deg, #fde6dd 0%, #f8cfc0 100%)', pinColor: '#A32D2D', dark: false }, // peach
    { mapBg: 'linear-gradient(135deg, #d9f0f0 0%, #bfe6e6 100%)', pinColor: '#0E7C86', dark: false }, // teal
    { mapBg: 'linear-gradient(135deg, #fdf3d9 0%, #f8e7b5 100%)', pinColor: '#B8860B', dark: false }, // amber
];

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildLayout(index = 0) {
    const palette = PALETTES[index % PALETTES.length];
    const pinCount = randomBetween(2, 4);
    const pins = Array.from({ length: pinCount }).map((_, i) => ({
        top: randomBetween(20, 72),
        left: randomBetween(15, 80),
        selected: i === 0,
    }));
    return { palette, pins };
}

export default function MapPreview({ index = 0 }) {
    // Color is fixed by index; pin positions are still randomized on the client
    // after hydration so the server and client markup match.
    const [layout, setLayout] = useState(null);

    useEffect(() => {
        setLayout(buildLayout(index));
    }, [index]);

    const bg = layout?.palette.mapBg ?? PALETTES[index % PALETTES.length].mapBg;

    return (
        <div className={styles.map} style={{ background: bg }}>
            {/* grid lines */}
            <div className={styles.mapGridH} style={{ top: '25%' }} />
            <div className={styles.mapGridH} style={{ top: '50%' }} />
            <div className={styles.mapGridH} style={{ top: '75%' }} />
            <div className={styles.mapGridV} style={{ left: '25%' }} />
            <div className={styles.mapGridV} style={{ left: '50%' }} />
            <div className={styles.mapGridV} style={{ left: '75%' }} />
            {/* roads */}
            <div className={styles.mapRoadH} style={{ top: '48%', left: '5%', width: '55%' }} />
            <div className={styles.mapRoadV} style={{ left: '52%', top: '10%', height: '60%' }} />
            <div className={styles.mapRoadH} style={{ top: '68%', left: '30%', width: '60%', transform: 'rotate(-2deg)' }} />
            {/* pins */}
            {layout?.pins.map((p, i) => (
                <div
                    key={i}
                    className={`${styles.mapPin} ${p.selected ? styles.mapPinSelected : ''}`}
                    style={{ top: `${p.top}%`, left: `${p.left}%` }}
                >
                    <LuMapPin style={{ color: layout.palette.pinColor, opacity: p.selected ? 1 : 0.65 }} />
                </div>
            ))}
        </div>
    );
}
