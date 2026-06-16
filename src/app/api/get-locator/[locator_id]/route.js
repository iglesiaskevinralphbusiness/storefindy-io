import { NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/config/mongo.config';
import { LocatorModel } from '@/mongo/LocatorModel';
import { LocationModel } from '@/mongo/LocationsModel';
import { serializeForClient } from '@/utils/helpers';

// This endpoint returns a locator's public configuration so the embeddable
// store-locator widget can render. Like the search endpoint it is loaded from
// third-party sites, so every response carries permissive CORS headers and the
// route does not require an authenticated session.
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
    return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request, { params }) {
    const { locator_id: locatorId } = await params;

    if (!locatorId || !isValidObjectId(locatorId)) {
        return json({ status: 'error', message: 'A valid locator is required.', locator: null }, 400);
    }

    await dbConnect();

    // Exclude the owning account from the public payload; the widget only needs
    // display settings, not who owns the locator.
    const locator = await LocatorModel.findById(locatorId).select('-user_id').lean();
    if (!locator) {
        return json({ status: 'error', message: 'Locator not found.', locator: null }, 404);
    }

    const countries = await LocationModel.distinct('country', { locator_id: locatorId })

    return json({
        status: 'success',
        locator: serializeForClient(locator),
        countries: serializeForClient(countries),
    });
}
