/** Miles ↔ kilometers conversion (1 mi = 1.60934 km). */
export const MI_TO_KM = 1.60934;

export function milesToKm(miles) {
    return miles * MI_TO_KM;
}

export function kmToMiles(km) {
    return km / MI_TO_KM;
}

/** Round a value to the nearest multiple of `step` (default 5). */
export function roundToMultipleOf(value, step = 5) {
    return Math.round(value / step) * step;
}

/** Round a km radius to the nearest multiple of 5 for cleaner preset values. */
export function roundKmRadius(km) {
    return roundToMultipleOf(km, 5);
}

/** Base search-radius presets — mile and km lists are paired by index. */
const BASE_RADIUS_MILES = [10, 25, 50, 100, 300, 500, 1000, 2000];
const BASE_RADIUS_KM = [15, 40, 80, 160, 480, 800, 1600, 3200];

function milePresetToKm(miles) {
    const index = BASE_RADIUS_MILES.indexOf(Number(miles));
    if (index !== -1) return BASE_RADIUS_KM[index];
    return roundKmRadius(milesToKm(miles));
}

function kmPresetToMiles(km) {
    const index = BASE_RADIUS_KM.indexOf(Number(km));
    if (index !== -1) return BASE_RADIUS_MILES[index];
    return Math.round(kmToMiles(km));
}

/** Convert a distance value between mi and km. Preset pairs snap to their counterpart. */
export function convertDistance(value, fromUnit, toUnit) {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'mi' && toUnit === 'km') return milePresetToKm(value);
    if (fromUnit === 'km' && toUnit === 'mi') return kmPresetToMiles(value);
    return value;
}

/** Format a distance for display (2 decimal places). */
export function formatDistanceDisplay(value, unit) {
    const label = unit === 'km' ? 'km' : 'mi';
    return `${Number(value).toFixed(2)} ${label}`;
}

export const DISTANCE_UNITS = [
    { code: 'mi', label: 'Miles (mi)' },
    { code: 'km', label: 'Kilometers (km)' },
];

/** Dropdown options for the create/edit form and the locator widget. */
export function getSearchRadiiOptions(unit = 'mi') {
    if (unit === 'km') {
        return BASE_RADIUS_KM.map((km) => ({
            code: String(km),
            label: `${km} kilometers`,
        }));
    }
    return BASE_RADIUS_MILES.map((miles) => ({
        code: String(miles),
        label: `${miles} miles`,
    }));
}

/** Numeric radius values for the widget radius select. */
export function getSearchRadiiValues(unit = 'mi') {
    return getSearchRadiiOptions(unit).map((r) => Number(r.code));
}
