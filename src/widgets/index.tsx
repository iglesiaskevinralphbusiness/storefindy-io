import { defineWidget } from './defineWidget';
import { locatorStyles } from '../components/Locator';
import LocatorWidget from './LocatorWidget';

// Leaflet's CSS is injected by the build (build-widgets.mjs). It must live
// inside the shadow root with our own styles — document <head> styles can't
// reach the shadow-DOM map, which is what left the tiles unpositioned.
const leafletCss = process.env.__LEAFLET_CSS__ ?? '';
// mapbox-gl's CSS, for locators on `map_library: 'mapbox'`. Same reason it has
// to be here rather than in <head>, and it is inert for the Leaflet map.
const mapboxCss = process.env.__MAPBOX_CSS__ ?? '';

defineWidget<{ locator?: string }>({
	tagName: 'locator-widget',
	component: LocatorWidget,
	observedAttributes: ['locator'],
	styles: leafletCss + '\n' + mapboxCss + '\n' + locatorStyles,
});
