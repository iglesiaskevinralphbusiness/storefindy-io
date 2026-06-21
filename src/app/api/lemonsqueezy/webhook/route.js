import { NextResponse } from 'next/server';
import { dbConnect } from '@/config/mongo.config';
import { UserModel } from '@/mongo';
import { verifyWebhookSignature, mapSubscription } from '@/lib/lemonsqueezy';

// Webhooks need the raw body for HMAC verification + Node's crypto, so pin this
// route to the Node.js runtime and disable any caching.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/lemonsqueezy/webhook
// Configure this URL in Lemon Squeezy → Settings → Webhooks, subscribed to the
// subscription_* (and order_created) events, signed with LEMONSQUEEZY_WEBHOOK_SECRET.
export async function POST(request) {
    // Read the RAW body first — re-serializing parsed JSON would change bytes
    // and break signature verification.
    const rawBody = await request.text();
    const signature = request.headers.get('x-signature') || '';

    if (!verifyWebhookSignature(rawBody, signature)) {
        return NextResponse.json({ status: 'error', message: 'Invalid signature.' }, { status: 401 });
    }

    let event;
    try {
        event = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ status: 'error', message: 'Invalid payload.' }, { status: 400 });
    }

    const eventName = event?.meta?.event_name || '';
    const customUserId = event?.meta?.custom_data?.user_id || '';
    const resource = event?.data || {};
    const attributes = resource.attributes || {};

    await dbConnect();

    // Resolve the account: custom_data.user_id (set at checkout) is the most
    // reliable; fall back to the Lemon Squeezy customer id, then the email.
    let user = null;
    if (customUserId) {
        user = await UserModel.findById(customUserId).catch(() => null);
    }
    if (!user && attributes.customer_id != null) {
        user = await UserModel.findOne({ ls_customer_id: String(attributes.customer_id) });
    }
    if (!user && attributes.user_email) {
        user = await UserModel.findOne({ email: attributes.user_email });
    }

    if (!user) {
        // Acknowledge so Lemon Squeezy stops retrying; nothing to update.
        return NextResponse.json({ status: 'ignored', message: 'No matching user.' });
    }

    try {
        if (eventName.startsWith('subscription_')) {
            const live = mapSubscription(resource);

            user.ls_subscription_id = live.ls_subscription_id || user.ls_subscription_id;
            user.ls_customer_id = live.ls_customer_id || user.ls_customer_id;
            user.ls_order_id = live.ls_order_id || user.ls_order_id;
            user.ls_product_id = live.ls_product_id || user.ls_product_id;
            user.ls_variant_id = live.ls_variant_id || user.ls_variant_id;
            user.status = live.status;
            user.renewal_date = live.renewal_date || user.renewal_date;
            user.trial_ends_at = live.trial_ends_at || '';

            // Once the subscription has actually ended, drop back to the free
            // tier; otherwise reflect the plan the variant maps to.
            user.plan = live.status === 'expired' ? 'free' : live.plan;

            // "Subscribed since" — clear it on the free plan, otherwise track the
            // subscription's created_at (keeping any existing value if absent).
            user.plan_started = user.plan === 'free' ? '' : live.plan_started || user.plan_started;

            await user.save();
        } else if (eventName === 'order_created') {
            // First purchase — capture the order/customer ids if not already set.
            user.ls_order_id = resource.id != null ? String(resource.id) : user.ls_order_id;
            if (attributes.customer_id != null) {
                user.ls_customer_id = String(attributes.customer_id);
            }
            await user.save();
        }
        // Other events (e.g. license_*, subscription_payment_*) are acknowledged
        // without changes; add handling here if you later need them.

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        return NextResponse.json(
            { status: 'error', message: error.message || 'Webhook handling failed.' },
            { status: 500 }
        );
    }
}
