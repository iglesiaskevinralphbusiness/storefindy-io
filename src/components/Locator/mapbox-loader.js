// Loads mapbox-gl on demand, the first time a locator actually renders a Mapbox
// map. Nothing here runs for a locator on the default (Leaflet) library.
//
// The two bundles deliver the library differently:
//
//   Next.js app — the dynamic import below becomes a lazy chunk, so the npm
//   package's version is the one that ships and the dashboard only pays for it
//   on a Mapbox locator.
//
//   Embeddable widget — build-widgets.mjs resolves the bare `mapbox-gl`
//   specifier to widgets/mapbox-gl-cdn.js, which fetches the library from
//   Mapbox's CDN. esbuild's single-IIFE output cannot code-split, so bundling it
//   would ship ~800KB to every embed regardless of map library. That shim marks
//   itself with `__isCdnShim`, which is what the branch below detects.
//
// Either way the stylesheet is bundled locally (LocatorMapbox imports it), so
// only the script is ever fetched remotely.

// One in-flight load, shared by every map on the page.
let pending = null;

export default function loadMapboxGl() {
    if (pending) return pending;

    pending = (async () => {
        const mod = await import('mapbox-gl');
        if (mod.__isCdnShim) return mod.load();
        return mod.default ?? mod;
    })().catch((error) => {
        // Don't cache a failure — a transient network error shouldn't
        // permanently disable the map for the rest of the session.
        pending = null;
        throw error;
    });

    return pending;
}
