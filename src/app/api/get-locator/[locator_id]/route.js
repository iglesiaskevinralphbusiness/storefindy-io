import { NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/config/mongo.config';
import { UserModel, LocatorModel, LocationModel } from '@/mongo';
import { serializeForClient } from '@/utils/helpers';
import { plans } from '@/utils/constant/pricing';

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
    const locator = await LocatorModel.findById(locatorId).lean();
    if (!locator) {
        return json({ status: 'error', message: 'Locator not found.', locator: null }, 404);
    }

    const countries = await LocationModel.distinct('country', { locator_id: locatorId });
    const user = await UserModel.findOne({ _id: locator.user_id }).lean();
    if(!user) {
        return json({ status: 'error', message: 'Owner of locator not found.', locator: null }, 404);
    }

    // // inactive
    const plan = plans.find(p => p.id === user.plan) || plan[0];
    const skip = plan.max_locator;
    const inactiveIds = (await LocatorModel.find({ user_id: locator.user_id })
        .sort({ createdAt: 1 }) // oldest -> newest
        .skip(skip)
        .select('_id')
        .lean()
    ).map(({ _id }) => _id.toString());
  

    return json({
        status: 'success',
        locator: serializeForClient({
            ...locator,
            user_plan: user.plan,
            user_id: 'hidden',
            status: inactiveIds.includes(String(locator._id)) ? 'inactive' : 'active',
        }),
        countries: serializeForClient(countries),
    });
}
