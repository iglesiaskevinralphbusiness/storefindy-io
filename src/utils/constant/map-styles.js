// The base map (tile) styles a locator can be configured with, stored on the
// locator document as `map_style`.
//
// Every entry here is a free, keyless, subscription-free tile service, so the
// widget can render any of them without the embedding site holding credentials.
// The tile URLs mirror what `leaflet-providers` produces for each provider name,
// inlined so neither the Next.js app nor the esbuild widget bundle has to carry
// that package.
//
// CARTO's raster tiles at basemaps.cartocdn.com now watermark every request
// ("API KEY REQUIRED") and are being retired. A CARTO key cannot live in the
// public widget — it would be shared across every customer embed and capped at
// 5M tiles/month — so the Voyager / Positron / Dark Matter looks are served
// from Esri's keyless World Street Map and Gray Canvas tiles instead. Stored
// `CartoDB.*` codes stay the same so existing locators keep working.
//
// Three providers from the original shortlist are deliberately absent because
// they are transparent OVERLAYS rather than base maps — used on their own they
// render labels (or rail lines) floating over an empty grey canvas:
//   CartoDB.PositronOnlyLabels, CartoDB.VoyagerOnlyLabels, OpenRailwayMap

const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';
const ESRI_ATTRIBUTION = 'Tiles &copy; Esri';
const ESRI_STREET_ATTRIBUTION = `${ESRI_ATTRIBUTION} &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom`;
const ESRI_CANVAS_ATTRIBUTION = `${ESRI_ATTRIBUTION} &mdash; Esri, DeLorme, NAVTEQ`;
const USGS_ATTRIBUTION = 'Tiles courtesy of the U.S. Geological Survey';

// Colorful street map (replaces CARTO Voyager). ArcGIS uses {z}/{y}/{x} order.
// Labels are fused into this JPEG, so Voyager (No Labels) is the light canvas
// plus a transparent road overlay — streets without city/town names.
// Native coverage is unreliable past zoom 17 (Esri serves a "Map data not yet
// available" placeholder), so we stop the map there instead of requesting
// empty tiles or stretching lower ones.
const ESRI_STREET = {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    maxZoom: 17,
    attribution: ESRI_STREET_ATTRIBUTION,
};

// Light gray canvas (replaces CARTO Positron). Native tiles stop at zoom 16;
// past that Esri returns a placeholder, and upscaling looks stretched. Cap
// both the layer and the map at 16. The Base layer has the street grid only;
// city/town names live on the transparent Reference overlay (`labelsUrl`).
const ESRI_LIGHT_GRAY = {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    maxZoom: 16,
    attribution: ESRI_CANVAS_ATTRIBUTION,
};
const ESRI_LIGHT_GRAY_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const ESRI_DARK_GRAY_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const ESRI_TRANSPORTATION = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';

// Dark gray canvas (replaces CARTO Dark Matter). Same Base + Reference split.
const ESRI_DARK_GRAY = {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    maxZoom: 16,
    attribution: ESRI_CANVAS_ATTRIBUTION,
};

// The style used when `map_style` is empty/null/undefined or names something we
// no longer ship. This is the tile layer the map has always rendered, so
// existing locators keep the exact look they had before the setting existed.
export const DEFAULT_MAP_STYLE = 'CartoDB.Voyager';

export const MAP_STYLES = [
    {
        code: 'CartoDB.Voyager',
        label: 'Voyager (Default)',
        ...ESRI_STREET,
    },
    {
        code: 'CartoDB.VoyagerNoLabels',
        label: 'Voyager (No Labels)',
        ...ESRI_LIGHT_GRAY,
        overlayUrl: ESRI_TRANSPORTATION,
    },
    {
        code: 'CartoDB.Positron',
        label: 'Positron (Light)',
        ...ESRI_LIGHT_GRAY,
        labelsUrl: ESRI_LIGHT_GRAY_LABELS,
    },
    {
        code: 'CartoDB.PositronNoLabels',
        label: 'Positron (Light, No Labels)',
        ...ESRI_LIGHT_GRAY,
    },
    {
        code: 'CartoDB.DarkMatter',
        label: 'Dark Matter (Dark)',
        ...ESRI_DARK_GRAY,
        labelsUrl: ESRI_DARK_GRAY_LABELS,
    },
    {
        code: 'OpenStreetMap.Mapnik',
        label: 'OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: 'abc',
        maxZoom: 19,
        attribution: OSM_ATTRIBUTION,
    },
    {
        code: 'OpenStreetMap.HOT',
        label: 'OpenStreetMap Humanitarian',
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        subdomains: 'abc',
        maxZoom: 19,
        attribution: `${OSM_ATTRIBUTION}, Tiles style by Humanitarian OpenStreetMap Team`,
    },
    {
        code: 'OpenTopoMap',
        label: 'Topographic',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        subdomains: 'abc',
        // OpenTopoMap stops rendering past zoom 17.
        maxZoom: 17,
        attribution: `${OSM_ATTRIBUTION}, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)`,
    },
    {
        code: 'CyclOSM',
        label: 'CyclOSM (Cycling)',
        url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        subdomains: 'abc',
        maxZoom: 20,
        attribution: `${OSM_ATTRIBUTION}, CyclOSM | Map style: &copy; CyclOSM`,
    },
    {
        code: 'OPNVKarte',
        label: 'ÖPNVKarte (Public Transport)',
        url: 'https://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png',
        subdomains: '',
        maxZoom: 18,
        attribution: `${OSM_ATTRIBUTION} | Map style: &copy; memomaps.de (CC-BY-SA)`,
    },
    // The USGS services only publish tiles for the United States; outside it the
    // map renders blank, hence the labels below.
    {
        code: 'USGS.USTopo',
        label: 'USGS Topo (US only)',
        url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
        subdomains: '',
        maxZoom: 20,
        attribution: USGS_ATTRIBUTION,
    },
    {
        code: 'USGS.USImagery',
        label: 'USGS Satellite Imagery (US only)',
        url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
        subdomains: '',
        maxZoom: 20,
        attribution: USGS_ATTRIBUTION,
    },
    {
        code: 'USGS.USImageryTopo',
        label: 'USGS Imagery + Topo (US only)',
        url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}',
        subdomains: '',
        maxZoom: 20,
        attribution: USGS_ATTRIBUTION,
    },
];

// Option list for the customize sidebar's <SelectField />.
export const MAP_STYLE_OPTIONS = MAP_STYLES.map(({ code, label }) => ({ code, label }));

/**
 * Resolve a stored `map_style` value into a tile-layer definition. An empty,
 * null, undefined or unrecognised code falls back to DEFAULT_MAP_STYLE, so a
 * locator saved before this setting existed — or one pointing at a style we have
 * since dropped — still renders the original map.
 */
export function resolveMapStyle(code) {
    const fallback = MAP_STYLES.find((s) => s.code === DEFAULT_MAP_STYLE);
    if (!code || typeof code !== 'string') return fallback;
    return MAP_STYLES.find((s) => s.code === code) ?? fallback;
}
