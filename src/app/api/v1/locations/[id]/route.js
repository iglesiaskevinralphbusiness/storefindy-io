import { NextResponse } from 'next/server';
import { LocationModel } from '@/mongo';
import { dbConnect } from '@/config/mongo.config';
import {
    authenticateApiKey,
    jsonValidationError,
    jsonSuccess,
    requireOwnedLocation,
    requireOwnedLocator,
    withServerError,
} from '@/lib/api-auth';
import { withRateLimitHeaders } from '@/lib/api-rate-limit';
import {
    LOCATION_BODY_MAX_BYTES,
    LOCATION_LONG_STRING_PATHS,
    readJsonBody,
    validateLocationPayload,
} from '@/lib/api-payloads';
import { serializeForClient } from '@/utils/helpers';

// REST equivalent of getLocationById() — src/actions/locations.js
//
//   GET /api/v1/locations/:id
//   Authorization: Bearer sf_live_...
export async function GET(request, { params }) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    // Authorization: scoped to the caller's own locations.
    const owned = await requireOwnedLocation(auth.user_id, id);
    if (owned.error) return owned.error;

    // Stamped by hand — this is the one success path that does not go through
    // withServerError(), which applies the quota headers for every other route.
    return withRateLimitHeaders(
        NextResponse.json(serializeForClient(owned.location), { status: 200 }),
        auth.rate
    );
}

// REST equivalent of postEditLocation() — src/actions/locations.js
//
//   PUT /api/v1/locations/:id
//   Authorization: Bearer sf_live_...
//
// Partial update: only the fields present in the body are written, so omitted
// fields keep their current values.
export async function PUT(request, { params }) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    const owned = await requireOwnedLocation(auth.user_id, id);
    if (owned.error) return owned.error;

    // Raised body cap + the image exemption: `icon` and `photo` are stored as
    // base64 data URLs, so they are far longer than the generic caps allow.
    const { body, errors: bodyErrors } = await readJsonBody(request, {
        maxBytes: LOCATION_BODY_MAX_BYTES,
        longStringPaths: LOCATION_LONG_STRING_PATHS,
    });
    if (bodyErrors) return jsonValidationError(bodyErrors);

    const { form, errors } = validateLocationPayload(body, { partial: true });
    if (errors) return jsonValidationError(errors);

    if (Object.keys(form).length === 0) {
        return jsonValidationError({ body: 'No updatable fields supplied' });
    }

    // Moving a location to another locator is only allowed within the account.
    if (form.locator_id) {
        const ownedLocator = await requireOwnedLocator(auth.user_id, form.locator_id);
        if (ownedLocator.error) return ownedLocator.error;
    }

    return withServerError(async () => {
        await dbConnect();
        const location = await LocationModel.findByIdAndUpdate(id, form, { new: true }).lean();
        return jsonSuccess('Location updated successfully', serializeForClient(location));
    }, auth);
}

// REST equivalent of postDeleteLocation() — src/actions/locations.js
//
//   DELETE /api/v1/locations/:id
//   Authorization: Bearer sf_live_...
export async function DELETE(request, { params }) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    const owned = await requireOwnedLocation(auth.user_id, id);
    if (owned.error) return owned.error;

    return withServerError(async () => {
        await dbConnect();
        await LocationModel.findByIdAndDelete(id);
        return jsonSuccess('Location deleted successfully');
    }, auth);
}
