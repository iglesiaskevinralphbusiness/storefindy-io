// Stands in for the `mapbox-gl` package inside the embeddable widget bundle.
//
// esbuild emits a single IIFE and cannot code-split, so a bundled
// `import('mapbox-gl')` inlines all ~800KB of the library into
// public/widgets.js for every embed — whether or not that locator uses Mapbox
// (measured: 557KB -> 2.4MB). build-widgets.mjs therefore resolves the bare
// `mapbox-gl` specifier to this module instead, and the library is fetched from
// Mapbox's own CDN the first time a Mapbox locator renders. Only the bare
// specifier is redirected: `mapbox-gl/dist/mapbox-gl.css` still resolves to the
// real package, so the stylesheet stays bundled and offline-safe.
//
// components/Locator/mapbox-loader.js recognises this module by `__isCdnShim`
// and calls `load()` instead of using the module as the library itself.

export const __isCdnShim = true;

// Keep in step with the `mapbox-gl` version in package.json, so the widget and
// the dashboard render a locator identically.
const CDN_VERSION = '3.29.0';
const CDN_SCRIPT = `https://api.mapbox.com/mapbox-gl-js/v${CDN_VERSION}/mapbox-gl.js`;

export function load() {
    if (typeof window === 'undefined') return Promise.reject(new Error('mapbox-gl requires a browser'));
    if (window.mapboxgl) return Promise.resolve(window.mapboxgl);

    return new Promise((resolve, reject) => {
        // A page embedding the widget twice — or a host site that already loads
        // mapbox-gl — must reuse the existing <script> rather than race a second
        // copy of the library.
        const existing = document.querySelector(`script[src="${CDN_SCRIPT}"]`);
        const script = existing ?? document.createElement('script');

        script.addEventListener('load', () => (window.mapboxgl
            ? resolve(window.mapboxgl)
            : reject(new Error('mapbox-gl loaded but did not register itself'))), { once: true });
        script.addEventListener('error', () => reject(new Error('Failed to load mapbox-gl from the Mapbox CDN')), { once: true });

        if (!existing) {
            script.src = CDN_SCRIPT;
            script.async = true;
            document.head.appendChild(script);
        }
    });
}

const shim = { __isCdnShim, load };
export default shim;
