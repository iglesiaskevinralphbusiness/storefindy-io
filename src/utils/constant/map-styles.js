// The base map (tile) styles a locator can be configured with, stored on the
// locator document as `map_style`.
//
// Every entry here is a free, keyless, subscription-free tile service, so the
// widget can render any of them without the embedding site holding credentials.
// The tile URLs mirror what `leaflet-providers` produces for each provider name,
// inlined so neither the Next.js app nor the esbuild widget bundle has to carry
// that package.
//
// Three providers from the original shortlist are deliberately absent because
// they are transparent OVERLAYS rather than base maps — used on their own they
// render labels (or rail lines) floating over an empty grey canvas:
//   CartoDB.PositronOnlyLabels, CartoDB.VoyagerOnlyLabels, OpenRailwayMap

const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';
const CARTO_ATTRIBUTION = `${OSM_ATTRIBUTION}, &copy; CARTO`;
const USGS_ATTRIBUTION = 'Tiles courtesy of the U.S. Geological Survey';

// The style used when `map_style` is empty/null/undefined or names something we
// no longer ship. This is the tile layer the map has always rendered, so
// existing locators keep the exact look they had before the setting existed.
export const DEFAULT_MAP_STYLE = 'CartoDB.Voyager';

export const MAP_STYLES = [
    {
        code: 'CartoDB.Voyager',
        label: 'Voyager (Default)',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: CARTO_ATTRIBUTION,
    },
    {
        code: 'CartoDB.VoyagerNoLabels',
        label: 'Voyager (No Labels)',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: CARTO_ATTRIBUTION,
    },
    {
        code: 'CartoDB.Positron',
        label: 'Positron (Light)',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: CARTO_ATTRIBUTION,
    },
    {
        code: 'CartoDB.PositronNoLabels',
        label: 'Positron (Light, No Labels)',
        url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: CARTO_ATTRIBUTION,
    },
    {
        code: 'CartoDB.DarkMatter',
        label: 'Dark Matter (Dark)',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: CARTO_ATTRIBUTION,
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
