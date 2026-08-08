import { NextResponse } from 'next/server';
import { LocatorModel, LocationModel, SubDomainModel } from '@/mongo';
import { dbConnect } from '@/config/mongo.config';
import {
    authenticateApiKey,
    jsonError,
    jsonValidationError,
    jsonSuccess,
    requireOwnedLocator,
    withServerError,
} from '@/lib/api-auth';
import { queryLocatorById } from '@/lib/locators-query';
import { readJsonBody, validateLocatorPayload } from '@/lib/api-payloads';
import { toPublicLocator, toPublicLocatorDetail } from '@/lib/api-serializers';
import { serializeForClient } from '@/utils/helpers';

// REST equivalent of getLocatorById() — src/actions/locator.js
//
//   GET /api/v1/locators/:id
//   Authorization: Bearer sf_live_...
export async function GET(request, { params }) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    return withServerError(async () => {
        const locator = await queryLocatorById(auth.user_id, id);
        // getLocatorById() returns null for a malformed ID or another user's locator.
        if (!locator) return jsonError('Locator not found.', 404);

        return NextResponse.json(toPublicLocatorDetail(locator), { status: 200 });
    }, auth);
}

// REST equivalent of postEditLocator() — src/actions/locator.js
//
//   PUT /api/v1/locators/:id
//   Authorization: Bearer sf_live_...
//
// Partial update: only the fields present in the body are written, so omitted
// fields keep their current values.
export async function PUT(request, { params }) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    const owned = await requireOwnedLocator(auth.user_id, id);
    if (owned.error) return owned.error;

    const { body, errors: bodyErrors } = await readJsonBody(request);
    if (bodyErrors) return jsonValidationError(bodyErrors);

    const { form, errors } = validateLocatorPayload(body, { partial: true });
    if (errors) return jsonValidationError(errors);

    if (Object.keys(form).length === 0) {
        return jsonValidationError({ body: 'No updatable fields supplied' });
    }

    return withServerError(async () => {
        await dbConnect();
        const locator = await LocatorModel.findByIdAndUpdate(id, form, { new: true }).lean();
        return jsonSuccess(
            'Locator updated successfully',
            toPublicLocator(serializeForClient(locator))
        );
    }, auth);
}

// REST equivalent of postDeleteLocator() — src/actions/locator.js
//
//   DELETE /api/v1/locators/:id
//   Authorization: Bearer sf_live_...
//
// Cascades to the locator's locations and sub-domains, same as the action.
export async function DELETE(request, { params }) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    const owned = await requireOwnedLocator(auth.user_id, id);
    if (owned.error) return owned.error;

    return withServerError(async () => {
        await dbConnect();
        await LocatorModel.findByIdAndDelete(id);
        await LocationModel.deleteMany({ locator_id: id });
        await SubDomainModel.deleteMany({ locator_id: id });
        return jsonSuccess('Locator deleted successfully');
    }, auth);
}
