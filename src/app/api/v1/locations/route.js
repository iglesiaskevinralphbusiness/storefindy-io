import { NextResponse } from 'next/server';
import { authenticateApiKey, jsonError } from '@/lib/api-auth';
import { queryLocations } from '@/lib/locations-query';

// REST equivalent of the dashboard server action `getLocations()` in
// src/actions/locations.js — same query, same response shape. The only
// difference is the caller is identified by a Bearer API key instead of a
// NextAuth session.
//
//   GET /api/v1/locations?page=1&rows=10&sort=createdAt&order=asc&search=&locators=
//   Authorization: Bearer sf_live_...
export async function GET(request) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const user = await UserModel.findOne({ api_auth_key: auth.api_key });
    if (!user) return jsonError('Invalid API key.', 401);

    const { searchParams } = new URL(request.url);

    try {
        const result = await queryLocations({
            // authenticateApiKey() already resolved the owner from the Bearer key.
            user_id: auth.user_id,
            page: searchParams.get('page') ?? 1,
            rows: searchParams.get('rows') ?? 10,
            sort: searchParams.get('sort') ?? 'createdAt',
            order: searchParams.get('order') ?? 'asc',
            search: searchParams.get('search') ?? '',
            locators: searchParams.get('locators') ?? '',
        });

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.log(error);
        return jsonError('Server error. Please try again.', 500);
    }
}
