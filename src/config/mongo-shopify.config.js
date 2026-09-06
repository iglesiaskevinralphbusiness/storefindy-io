import mongoose from 'mongoose';

/*
 * Second, read-only connection: the Shopify app's database.
 *
 * The Shopify app (storefindy-shopify) keeps its own database — DATABASE_URL_SHOPIFY
 * — with its own shops, locators and locations. The main site's connection in
 * mongo.config.js is the DEFAULT mongoose connection and every model in src/mongo
 * is registered on it, so pointing it anywhere else would silently move the whole
 * site. A named connection created with `mongoose.createConnection()` keeps the two
 * apart: the default connection stays on DATABASE_URL, this one stays on the
 * Shopify database, and neither can be confused for the other.
 *
 * No models are registered here on purpose. The admin screens only READ shops, and
 * the schemas live in the Shopify repo — duplicating them here would give us two
 * definitions to keep in sync for no gain. Callers go through the native driver
 * collections instead (see src/lib/shopify-shops-query.js).
 */

// Cached across hot reloads and across lambda invocations, the same way
// mongo.config.js caches the main connection — a new pool per request would
// exhaust the cluster's connection limit.
const cache = global.mongooseShopify || { conn: null, promise: null };
global.mongooseShopify = cache;

export async function shopifyDbConnect() {
    if (cache.conn) {
        return cache.conn;
    }

    if (!cache.promise) {
        const conString = process.env.DATABASE_URL_SHOPIFY;
        if (!conString) {
            throw new Error('DATABASE_URL_SHOPIFY is not set.');
        }

        // autoIndex off: this app never writes here, and building indexes for a
        // schema we do not own is not ours to do.
        cache.promise = mongoose.createConnection(conString, { autoIndex: false }).asPromise();
    }

    try {
        cache.conn = await cache.promise;
    } catch (error) {
        // Drop the rejected promise so the next request can retry instead of
        // replaying the same failure forever.
        cache.promise = null;
        throw error;
    }

    return cache.conn;
}
