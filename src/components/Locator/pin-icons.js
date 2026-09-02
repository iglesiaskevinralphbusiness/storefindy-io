// The locator's map markers, as plain HTML strings plus their geometry.
//
// Two renderers consume these: LocatorMap (Leaflet, wrapping each in
// L.divIcon) and LocatorMapbox (mapbox-gl, wrapping each in a positioned
// <div> handed to mapboxgl.Marker). Keeping the markup here — rather than
// duplicating it per renderer — is what makes a locator's pins look identical
// whichever map library it is configured for.
//
// Every builder returns { html, width, height, anchorX, anchorY }, where the
// anchor is the offset from the element's top-left corner to the point on the
// map the marker represents.

// Pixel dimensions for each configurable pin size (settings.pin.size). The
// existing default ("small") is 32px; medium and large scale up from there.
const PIN_SIZE_PX = { small: 32, medium: 44, large: 56 };

export function pinPixelSize(size) {
    return PIN_SIZE_PX[size] ?? PIN_SIZE_PX.small;
}

// Result pins mark a point with the tip of the teardrop, so they are anchored
// at bottom-center.
function teardrop(html, px) {
    return { html, width: px, height: px, anchorX: px / 2, anchorY: px };
}

// A teardrop pin in the locator's brand color (settings.pin.color).
export function pinIcon(color = '#185FA5', size = 'small') {
    const px = pinPixelSize(size);
    return teardrop(
        `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
        px,
    );
}

// A pin built from a user-uploaded image (settings.pin.image, a data URL) used
// when the locator's pin type is "custom". The image is scaled to the
// configured pin size. When `number` is provided (i.e. "Show pin number" is on)
// it is drawn as a badge on top of the image so the marker still mirrors the
// store list's ordinal.
export function customImageIcon(image, size = 'small', number, textColor, textSize) {
    const px = pinPixelSize(size);
    const img = `<img src="${image}" width="${px}" height="${px}" style="width:${px}px;height:${px}px;object-fit:contain;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))" alt="" />`;
    let badge = '';
    if (number != null) {
        const fill = textColor || '#fff';
        const fontPx = Number(textSize) > 0 ? Number(textSize) : 12;
        badge = `<span style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:bold;font-size:${fontPx}px;color:${fill};text-shadow:0 1px 2px rgba(0,0,0,0.5);pointer-events:none">${number}</span>`;
    }
    // Anchored at bottom-center like the standard teardrop (whose tip marks the
    // location) rather than centered, which made it appear lower.
    return teardrop(`<div style="position:relative;width:${px}px;height:${px}px">${img}${badge}</div>`, px);
}

// A numbered pin mirroring the store list's ordinal (index + 1), so a result's
// position in the list matches its marker on the map. textColor / textSize fall
// back to #fff / 14px when their settings are empty.
export function numberedPinIcon(color = '#185FA5', number, size = 'small', textColor, textSize) {
    const px = pinPixelSize(size);
    const fill = textColor || '#fff';
    const fontPx = Number(textSize) > 0 ? Number(textSize) : 14;
    // The SVG is drawn in a 24-unit viewBox scaled to `px`, so convert the
    // desired pixel font size back into viewBox units.
    const fontUnits = (fontPx * 24) / px;
    return teardrop(
        `<svg width="${px}" height="${px}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}"/><text x="12" y="9" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="${fontUnits}" font-weight="bold" fill="${fill}">${number}</text></svg>`,
        px,
    );
}

// The draggable "search from here" person marker is a fixed size — it is a
// control rather than a result pin, so it deliberately ignores settings.pin.size.
// The hit area the glyph is centered in; the box itself draws nothing.
const PERSON_ICON_W = 28;
const PERSON_ICON_H = 33;
const PERSON_GLYPH_PX = 20;
// The ImMan glyph is always this red, independent of the locator's pin color.
const PERSON_ICON_FILL = '#ca4940';

// The ImMan glyph from react-icons/im (its head + body paths and 16-unit
// viewBox, verbatim). Both renderers take an HTML string rather than a React
// node, so the paths are inlined here instead of rendering <ImMan /> — that
// keeps react-dom/server out of both the Next.js and esbuild widget bundles.
const IM_MAN_VIEWBOX = '0 0 16 16';
const IM_MAN_PATHS = [
    'M9 1.5c0 0.828-0.672 1.5-1.5 1.5s-1.5-0.672-1.5-1.5c0-0.828 0.672-1.5 1.5-1.5s1.5 0.672 1.5 1.5z',
    'M9 4h-3c-0.552 0-1 0.448-1 1v5h1v6h1.25v-6h0.5v6h1.25v-6h1v-5c0-0.552-0.448-1-1-1z',
];

// The person marker that stands on the map's current search center when dynamic
// search is off. The bare ImMan glyph, centered in a transparent box that is a
// little larger than the glyph so it stays easy to grab.
export function personIcon() {
    const w = PERSON_ICON_W;
    const h = PERSON_ICON_H;
    const glyphPx = PERSON_GLYPH_PX;
    const paths = IM_MAN_PATHS.map((d) => `<path d="${d}"/>`).join('');
    return {
        html: `<div title="Drag to search this area" style="box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:${w}px;height:${h}px;background:transparent;border:unset;border-radius:50%;cursor:grab"><svg width="${glyphPx}" height="${glyphPx}" viewBox="${IM_MAN_VIEWBOX}" fill="${PERSON_ICON_FILL}" xmlns="http://www.w3.org/2000/svg">${paths}</svg></div>`,
        width: w,
        height: h,
        // Centered on the coordinate rather than standing on it like the
        // teardrop pins, so the glyph sits over the point it represents.
        anchorX: w / 2,
        anchorY: h / 2,
    };
}

/**
 * Pick the marker for one result, applying the same precedence in both
 * renderers: a per-location icon overrides everything, then the locator's
 * uploaded custom pin, then the numbered pin, then the plain teardrop.
 */
export function iconForLocation(loc, index, {
    showPinNumber = false,
    pinColor = '#185FA5',
    pinSize = 'small',
    pinTextColor,
    pinTextSize,
    pinType = 'standard',
    pinImage = '',
} = {}) {
    // A per-location icon overrides the locator pin whenever it is a non-empty
    // string. undefined / null / '' keep the locator default.
    const locationIcon = typeof loc.icon === 'string' ? loc.icon.trim() : '';
    const pinNumber = showPinNumber ? index + 1 : null;
    const useCustomImage = pinType === 'custom' && !!pinImage;

    if (locationIcon) return customImageIcon(locationIcon, pinSize, pinNumber, pinTextColor, pinTextSize);
    if (useCustomImage) return customImageIcon(pinImage, pinSize, pinNumber, pinTextColor, pinTextSize);
    if (showPinNumber) return numberedPinIcon(pinColor, index + 1, pinSize, pinTextColor, pinTextSize);
    return pinIcon(pinColor, pinSize);
}
