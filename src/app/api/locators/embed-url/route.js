import { NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/config/mongo.config';
import { LocatorModel } from '@/mongo';

// Records the page a widget is embedded on. Like the other widget endpoints it
// is called from third-party sites, so it carries permissive CORS headers and
// no session requirement.
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
    return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request) {
    const { searchParams } = new URL(request.url);

    // The widget never posts on the dashboard preview, but the flag is honoured
    // here too so a demo render can never overwrite a live embed URL.
    const isDemo = searchParams.get('is_demo') === 'true';
    if (isDemo) return json({ status: 'success' });

    let body = {};
    try {
        body = await request.json();
    } catch {
        return json({ status: 'error', message: 'A JSON body is required.' }, 400);
    }

    const locatorId = body.locator_id || searchParams.get('locator_id') || '';
    if (!locatorId || !isValidObjectId(locatorId)) {
        return json({ status: 'error', message: 'A valid locator is required.' }, 400);
    }

    // Only real http(s) pages are stored — anything else (file://, about:blank,
    // a relative string) is not an embed location worth recording.
    let url = '';
    try {
        const parsed = new URL(String(body.url || ''));
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return json({ status: 'error', message: 'A valid website URL is required.' }, 400);
        }
        url = parsed.href;
    } catch {
        return json({ status: 'error', message: 'A valid website URL is required.' }, 400);
    }

    await dbConnect();

    // Guarded on the value so a locator that keeps loading on the same page
    // costs a matched-but-unmodified update instead of a write per view.
    await LocatorModel.updateOne(
        { _id: locatorId, embeded_website_url: { $ne: url } },
        { $set: { embeded_website_url: url } }
    );

    return json({ status: 'success' });
}
