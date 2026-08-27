/** Canonical production host for widget API calls. */
export const WIDGET_API_ORIGIN = 'https://www.storefindy.com';

/**
 * Resolve the Storefindy API origin for embedded widgets.
 * Uses the origin of the loaded `widgets.js` script so local dev
 * (`localhost:3000/widgets.js`) hits the local API, while production
 * embeds keep calling `www.storefindy.com`.
 */
export function getWidgetApiOrigin() {
    if (typeof document === 'undefined') return WIDGET_API_ORIGIN;

    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src;
        if (src && /\/widgets\.js(?:\?|#|$)/.test(src)) {
            try {
                return new URL(src).origin;
            } catch {
                break;
            }
        }
    }

    return WIDGET_API_ORIGIN;
}
