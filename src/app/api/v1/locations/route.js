import { NextResponse } from 'next/server';
import { LocationModel } from '@/mongo';
import { dbConnect } from '@/config/mongo.config';
import {
    authenticateApiKey,
    jsonValidationError,
    jsonSuccess,
    requireOwnedLocator,
    withServerError,
} from '@/lib/api-auth';
import { queryLocations } from '@/lib/locations-query';
import {
    LOCATION_BODY_MAX_BYTES,
    LOCATION_LONG_STRING_PATHS,
    readJsonBody,
    validateLocationPayload,
} from '@/lib/api-payloads';
import { serializeForClient } from '@/utils/helpers';

// REST equivalent of the dashboard server action `getLocations()` in
// src/actions/locations.js — same query, same response shape. The only
// difference is the caller is identified by a Bearer API key instead of a
// NextAuth session.
//
//   GET /api/v1/locations?page=1&rows=10&sort=createdAt&order=asc&search=&locators=
//   Authorization: Bearer sf_live_...
export async function GET(request) {
    // Authentication: resolves the owning user from the Bearer key, or returns
    // a 401 response. Every record below is scoped to that user's id, which is
    // what authorizes the read.
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);

    return withServerError(async () => {
        // Each of these is sanitized inside queryLocations() — `search` is
        // regex-escaped, `sort` is whitelisted, `page`/`rows` are clamped and
        // `locators` is parsed as an ObjectId list. See lib/api-sanitize.js.
        const result = await queryLocations({
            user_id: auth.user_id,
            page: searchParams.get('page') ?? 1,
            rows: searchParams.get('rows') ?? 10,
            sort: searchParams.get('sort') ?? 'createdAt',
            order: searchParams.get('order') ?? 'asc',
            search: searchParams.get('search') ?? '',
            locators: searchParams.get('locators') ?? '',
        });

        return NextResponse.json(result, { status: 200 });
    }, auth);
}

// REST equivalent of postCreateLocation() — src/actions/locations.js
//
//   POST /api/v1/locations
//   Authorization: Bearer sf_live_...
export async function POST(request) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    // Raised body cap + the image exemption: `icon` and `photo` are stored as
    // base64 data URLs, so they are far longer than the generic caps allow.
    const { body, errors: bodyErrors } = await readJsonBody(request, {
        maxBytes: LOCATION_BODY_MAX_BYTES,
        longStringPaths: LOCATION_LONG_STRING_PATHS,
    });
    if (bodyErrors) return jsonValidationError(bodyErrors);

    const { form, errors } = validateLocationPayload(body);
    if (errors) return jsonValidationError(errors);

    // Authorization: the location must be attached to a locator the caller owns.
    const owned = await requireOwnedLocator(auth.user_id, form.locator_id);
    if (owned.error) return owned.error;

    return withServerError(async () => {
        await dbConnect();
        const location = await LocationModel.create({ ...form, user_id: auth.user_id });
        return jsonSuccess(
            'Location added successfully',
            serializeForClient(location.toObject()),
            201
        );
    }, auth);
}
