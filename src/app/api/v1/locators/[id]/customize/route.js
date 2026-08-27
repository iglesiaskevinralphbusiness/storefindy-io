import { NextResponse } from 'next/server';
import { LocatorModel } from '@/mongo';
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
import { readJsonBody, validateCustomizePayload } from '@/lib/api-payloads';
import { toPublicLocatorCustomize } from '@/lib/api-serializers';

// REST equivalent of getLocatorById() + functionSaveCustomizeLocator() —
// src/actions/locator.js
//
//   GET  /api/v1/locators/:id/customize
//   PUT  /api/v1/locators/:id/customize
//   Authorization: Bearer sf_live_...
export async function GET(request, { params }) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    return withServerError(async () => {
        const locator = await queryLocatorById(auth.user_id, id);
        if (!locator) return jsonError('Locator not found.', 404);

        return NextResponse.json(toPublicLocatorCustomize(locator), { status: 200 });
    }, auth);
}

export async function PUT(request, { params }) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    const owned = await requireOwnedLocator(auth.user_id, id);
    if (owned.error) return owned.error;

    const { body, errors: bodyErrors } = await readJsonBody(request, { maxBytes: 1024 * 1024 });
    if (bodyErrors) return jsonValidationError(bodyErrors);

    const { form, errors } = validateCustomizePayload(body, { plan: auth.plan });
    if (errors) return jsonValidationError(errors);

    return withServerError(async () => {
        await dbConnect();
        await LocatorModel.findByIdAndUpdate(id, form, { new: true });

        const locator = await queryLocatorById(auth.user_id, id);
        if (!locator) return jsonError('Locator not found.', 404);

        return jsonSuccess(
            'Locator customize settings updated successfully',
            toPublicLocatorCustomize(locator)
        );
    }, auth);
}
