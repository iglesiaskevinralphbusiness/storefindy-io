import { NextResponse } from 'next/server';
import { LocatorModel } from '@/mongo';
import { dbConnect } from '@/config/mongo.config';
import {
    authenticateApiKey,
    jsonValidationError,
    jsonSuccess,
    withServerError,
} from '@/lib/api-auth';
import { queryLocators } from '@/lib/locators-query';
import { readJsonBody, validateLocatorPayload } from '@/lib/api-payloads';
import { serializeForClient } from '@/utils/helpers';

// REST equivalent of getLocators() — src/actions/locator.js
//
//   GET /api/v1/locators
//   Authorization: Bearer sf_live_...
export async function GET(request) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    return withServerError(async () => {
        const locators = await queryLocators(auth.user_id);
        return NextResponse.json(locators, { status: 200 });
    });
}

// REST equivalent of postCreateLocator() — src/actions/locator.js
//
//   POST /api/v1/locators
//   Authorization: Bearer sf_live_...
export async function POST(request) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { body, errors: bodyErrors } = await readJsonBody(request);
    if (bodyErrors) return jsonValidationError(bodyErrors);

    const { form, errors } = validateLocatorPayload(body);
    if (errors) return jsonValidationError(errors);

    return withServerError(async () => {
        await dbConnect();
        const locator = await LocatorModel.create({ ...form, user_id: auth.user_id });
        return jsonSuccess(
            'Locator created successfully',
            serializeForClient(locator.toObject()),
            201
        );
    });
}
