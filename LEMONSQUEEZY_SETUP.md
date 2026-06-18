# Lemon Squeezy Billing — Setup Guide

How to take the Storefindy billing integration from "code is in place" to "real
payments work". Lemon Squeezy is a **Merchant of Record**, so it owns the
payment method, invoices/receipts, tax/VAT handling, and the hosted customer
portal. Our database only mirrors plan / status / renewal date.

> **Status check:** the backend API routes are done. The billing _page_
> (`billing-client.js`) still shows demo data and has stub button handlers —
> see [Step 4](#4-wire-up-the-front-end) below. Payments are **not live** until
> all four steps are complete.

---

## What's already built

**Shared libraries** (`src/lib/`)
- `lemonsqueezy.js` — REST client + helpers (checkout, portal, subscription,
  cancel/resume/change, plan↔variant mapping, status normalization, webhook
  signature verification).
- `auth.js` — `getSessionUser()` resolves the NextAuth session into the
  `UserModel` document.

**API routes** (`src/app/api/lemonsqueezy/`)

| Route | Method | Purpose |
|---|---|---|
| `/checkout` | POST | Create a hosted checkout for `{ plan }` → returns redirect URL (upgrade flow) |
| `/portal` | GET | Returns the customer-portal URL (update card / invoices / cancel) |
| `/subscription` | GET | Current plan/status from DB, enriched with live card + URLs |
| `/subscription/cancel` | POST | Cancel at period end |
| `/subscription/resume` | POST | Undo a pending cancellation |
| `/subscription/change` | POST | Swap variant for upgrade/downgrade |
| `/webhook` | POST | Verifies signature, syncs `subscription_*` + `order_created` into MongoDB |

All routes are auth-guarded (401 when not signed in) and return a clean
**503 "not configured yet"** while the env values are still empty — so nothing
crashes before your account is approved.

**Database** — `src/mongo/UserModel.js` already holds the `ls_*`, `plan`,
`status`, `renewal_date`, and `trial_ends_at` fields. No schema change needed.

---

## Setup steps

### 1. Lemon Squeezy dashboard

1. Finish account registration and get your store **approved**.
2. **Create the product + variants** (Products → New):
   - A variant for the **Pro** plan ($10/mo)
   - A variant for the **Business** plan ($30/mo)
   - (No variant for Free — it has no Lemon Squeezy product.)
3. For each variant, use **"Copy variant ID"** — you'll need these for `.env`.
4. **Create a webhook** (Settings → Webhooks → +):
   - **URL:** `https://YOUR_DOMAIN/api/lemonsqueezy/webhook`
   - **Signing secret:** make one up (or let LS generate it) → goes in `.env`
   - **Events:** subscribe to all `subscription_*` events and `order_created`.

### 2. Fill in `.env`

```bash
# API key:  Lemon Squeezy → Settings → API → create a new key
LEMONSQUEEZY_API_KEY=
# Store id (numeric): Settings → Stores, or the number in the store URL/API
LEMONSQUEEZY_STORE_ID=
# Webhook signing secret: must match the secret on the webhook you created
LEMONSQUEEZY_WEBHOOK_SECRET=
# Variant ids that map to each paid plan ("Copy variant ID")
LEMONSQUEEZY_VARIANT_PRO=
LEMONSQUEEZY_VARIANT_BUSINESS=
```

Restart the dev server after editing `.env`.

### 3. Local testing — expose the webhook

Lemon Squeezy's servers **cannot reach `localhost:3000`**. To test webhooks
locally, open a tunnel and use its public URL in the webhook config:

```bash
ngrok http 3000
# then set the webhook URL to: https://<your-ngrok-id>.ngrok.app/api/lemonsqueezy/webhook
```

In production, just use your real domain.

### 4. Wire up the front end

The billing page (`src/app/(with-header-and-user-logged)/dashboard/billing/billing-client.js`)
still renders **hardcoded demo data** and has **stub button handlers**
(`goToLemonPortal` does nothing). To go live it needs to:

- Replace the demo `SUBSCRIPTIONS` data with a fetch to
  `GET /api/lemonsqueezy/subscription`.
- Upgrade button → `POST /api/lemonsqueezy/checkout` with `{ plan }`, then
  `window.location = url` from the response.
- "Manage on Lemon Squeezy" → `GET /api/lemonsqueezy/portal`, then redirect.
- Remove the dev Free/Subscribed toggle (it's fake state).

> This step is code, not configuration — ask Claude to "wire billing-client.js
> to the Lemon Squeezy endpoints" when you're ready.

---

## How the data flow works

```
User clicks "Upgrade"
  → POST /api/lemonsqueezy/checkout        (creates checkout, stamps user_id in custom_data)
  → browser redirects to Lemon Squeezy hosted checkout
  → user pays on Lemon Squeezy
  → Lemon Squeezy fires `subscription_created` webhook
  → POST /api/lemonsqueezy/webhook         (verifies signature, updates UserModel)
  → user redirected back to /dashboard/billing?checkout=success
  → billing page reads GET /api/lemonsqueezy/subscription → shows the new plan
```

The **webhook is the source of truth** that keeps MongoDB in sync. The
cancel/resume/change routes also update the DB immediately for a responsive UI,
but the webhook will re-confirm.

### User matching in the webhook
Layered, most reliable first:
1. `custom_data.user_id` (stamped during checkout)
2. `ls_customer_id`
3. `email`

Unknown users are acknowledged with `200` so Lemon Squeezy stops retrying.

---

## Plan ↔ variant mapping

| Plan | Source | Variant env |
|---|---|---|
| `free` | default; no LS product | — |
| `pro` | LS variant | `LEMONSQUEEZY_VARIANT_PRO` |
| `business` | LS variant | `LEMONSQUEEZY_VARIANT_BUSINESS` |

Status mapping (LS → our DB): `on_trial`/`active` → `active`,
`unpaid`/`past_due` → `past_due`, `paused` → `paused`, `cancelled` →
`cancelled`, `expired` → `expired` (and plan reset to `free`).

---

## Security notes

- The webhook verifies the `X-Signature` header with a timing-safe HMAC-SHA256
  against `LEMONSQUEEZY_WEBHOOK_SECRET` — requests with a bad/missing signature
  are rejected with `401`.
- Never expose `LEMONSQUEEZY_API_KEY` or `LEMONSQUEEZY_WEBHOOK_SECRET` to the
  client; they are server-only (no `NEXT_PUBLIC_` prefix).
- `.env` is git-ignored — keep it that way; share secrets out-of-band.
