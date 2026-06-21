import crypto from 'crypto';

/*
 * Lemon Squeezy REST client + helpers.
 *
 * Everything that talks to the Lemon Squeezy API goes through here so the route
 * handlers stay thin. Lemon Squeezy is a Merchant of Record, so it owns the
 * payment method, invoices/receipts, tax handling and the hosted customer
 * portal — our database only mirrors plan / status / renewal (see UserModel).
 *
 * Required env (see .env):
 *   LEMONSQUEEZY_API_KEY         — API key (Bearer token) from Settings → API
 *   LEMONSQUEEZY_STORE_ID        — numeric store id
 *   LEMONSQUEEZY_WEBHOOK_SECRET  — signing secret configured on the webhook
 *   LEMONSQUEEZY_VARIANT_PRO     — variant id that maps to the "pro" plan
 *   LEMONSQUEEZY_VARIANT_BUSINESS— variant id that maps to the "business" plan
 */

const LS_API = 'https://api.lemonsqueezy.com/v1';

// True once the core API credentials exist. Routes use this to return a clean
// 503 while the Lemon Squeezy account registration is still in progress.
export function isConfigured() {
    return Boolean(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID);
}

function requireConfigured() {
    if (!isConfigured()) {
        const err = new Error('Lemon Squeezy is not configured yet.');
        err.status = 503;
        throw err;
    }
}

// Thin wrapper around fetch that adds the JSON:API headers + auth and unwraps
// Lemon Squeezy error payloads into thrown Errors carrying an HTTP `status`.
async function lsFetch(path, options = {}) {
    requireConfigured();

    const res = await fetch(`${LS_API}${path}`, {
        ...options,
        headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
            ...(options.headers || {}),
        },
        cache: 'no-store',
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
        const message = data?.errors?.[0]?.detail || `Lemon Squeezy API error (${res.status}).`;
        const err = new Error(message);
        err.status = res.status;
        err.body = data;
        throw err;
    }

    return data;
}

/* ---------------------------------------------------------------- mapping -- */

// Lemon Squeezy variant id → our internal plan tier.
export function planFromVariantId(variantId) {
    const id = String(variantId || '');
    if (id && id === String(process.env.LEMONSQUEEZY_VARIANT_PRO)) return 'pro';
    if (id && id === String(process.env.LEMONSQUEEZY_VARIANT_BUSINESS)) return 'business';
    return 'free';
}

// Our internal plan tier → Lemon Squeezy variant id (null for the free plan,
// which has no Lemon Squeezy variant).
export function variantIdFromPlan(plan) {
    if (plan === 'pro') return process.env.LEMONSQUEEZY_VARIANT_PRO || null;
    if (plan === 'business') return process.env.LEMONSQUEEZY_VARIANT_BUSINESS || null;
    return null;
}

// Lemon Squeezy subscription status → the set the UserModel expects.
// LS statuses: on_trial | active | paused | past_due | unpaid | cancelled | expired
export function normalizeStatus(lsStatus) {
    switch (lsStatus) {
        case 'on_trial':
        case 'active':
            return 'active';
        case 'unpaid':
        case 'past_due':
            return 'past_due';
        case 'paused':
            return 'paused';
        case 'cancelled':
            return 'cancelled';
        case 'expired':
            return 'expired';
        default:
            return lsStatus || 'active';
    }
}

// Flatten a Lemon Squeezy subscription resource into the fields we persist /
// hand back to the client.
export function mapSubscription(resource) {
    const a = resource?.attributes || {};
    return {
        ls_subscription_id: String(resource?.id || ''),
        ls_customer_id: a.customer_id != null ? String(a.customer_id) : '',
        ls_order_id: a.order_id != null ? String(a.order_id) : '',
        ls_product_id: a.product_id != null ? String(a.product_id) : '',
        ls_variant_id: a.variant_id != null ? String(a.variant_id) : '',
        plan: planFromVariantId(a.variant_id),
        status: normalizeStatus(a.status),
        status_raw: a.status || '',
        plan_started: a.created_at || '',
        renewal_date: a.renews_at || '',
        ends_at: a.ends_at || '',
        trial_ends_at: a.trial_ends_at || '',
        card_brand: a.card_brand || '',
        card_last_four: a.card_last_four || '',
        urls: a.urls || {},
    };
}

/* ----------------------------------------------------------------- calls --- */

// Create a hosted checkout for a variant and return its URL. `custom` is echoed
// back verbatim in checkout/order/subscription webhooks (we stash user_id there
// so the webhook can find the account without relying on email).
export async function createCheckout({ variantId, email, custom = {}, redirectUrl }) {
    const payload = {
        data: {
            type: 'checkouts',
            attributes: {
                checkout_data: {
                    ...(email ? { email } : {}),
                    custom,
                },
                ...(redirectUrl
                    ? { product_options: { redirect_url: redirectUrl } }
                    : {}),
            },
            relationships: {
                store: { data: { type: 'stores', id: String(process.env.LEMONSQUEEZY_STORE_ID) } },
                variant: { data: { type: 'variants', id: String(variantId) } },
            },
        },
    };

    const data = await lsFetch('/checkouts', {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    return data?.data?.attributes?.url || null;
}

// Fetch a single subscription resource.
export async function getSubscription(subscriptionId) {
    const data = await lsFetch(`/subscriptions/${subscriptionId}`);
    return data?.data || null;
}

// List this store's subscriptions, optionally filtered by the customer email.
// Used by the sync fallback to find a freshly-created subscription when we have
// no subscription id on file yet (e.g. the webhook hasn't reached us).
export async function listSubscriptions({ email } = {}) {
    const params = new URLSearchParams();
    params.set('filter[store_id]', String(process.env.LEMONSQUEEZY_STORE_ID));
    if (email) params.set('filter[user_email]', email);

    const data = await lsFetch(`/subscriptions?${params.toString()}`);
    return data?.data || [];
}

// Apply a mapped subscription (see mapSubscription) onto a UserModel document.
// Shared by the webhook and the sync fallback so both write identical fields.
// Does NOT save — the caller decides when to persist.
export function applySubscriptionToUser(user, live) {
    user.ls_subscription_id = live.ls_subscription_id || user.ls_subscription_id;
    user.ls_customer_id = live.ls_customer_id || user.ls_customer_id;
    user.ls_order_id = live.ls_order_id || user.ls_order_id;
    user.ls_product_id = live.ls_product_id || user.ls_product_id;
    user.ls_variant_id = live.ls_variant_id || user.ls_variant_id;
    user.status = live.status;
    user.renewal_date = live.renewal_date || user.renewal_date;
    user.trial_ends_at = live.trial_ends_at || '';

    // Once the subscription has actually ended, drop back to the free tier;
    // otherwise reflect the plan the variant maps to.
    user.plan = live.status === 'expired' ? 'free' : live.plan;

    // "Subscribed since" — clear it on the free plan, otherwise track the
    // subscription's created_at (keeping any existing value if absent).
    user.plan_started = user.plan === 'free' ? '' : live.plan_started || user.plan_started;

    return user;
}

// Cancel at period end (Lemon Squeezy keeps it active until `ends_at`).
export async function cancelSubscription(subscriptionId) {
    const data = await lsFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' });
    return data?.data || null;
}

// Undo a pending cancellation.
export async function resumeSubscription(subscriptionId) {
    const payload = {
        data: {
            type: 'subscriptions',
            id: String(subscriptionId),
            attributes: { cancelled: false },
        },
    };
    const data = await lsFetch(`/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
    return data?.data || null;
}

// Swap the plan (upgrade/downgrade) by changing the variant. `invoiceImmediately`
// + proration give the user prorated billing on upgrade.
export async function changeSubscriptionVariant(subscriptionId, variantId, { invoiceImmediately = true } = {}) {
    const payload = {
        data: {
            type: 'subscriptions',
            id: String(subscriptionId),
            attributes: {
                variant_id: Number(variantId),
                invoice_immediately: invoiceImmediately,
            },
        },
    };
    const data = await lsFetch(`/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
    return data?.data || null;
}

/* --------------------------------------------------------------- webhook --- */

// Verify the `X-Signature` header (hex HMAC-SHA256 of the raw request body using
// the webhook signing secret). Returns false on any mismatch / missing secret.
export function verifyWebhookSignature(rawBody, signature) {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret || !signature) return false;

    const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

    const a = Buffer.from(digest, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}
