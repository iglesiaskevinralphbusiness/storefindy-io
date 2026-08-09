import { LocationModel } from '@/mongo';
import { dbConnect } from '@/config/mongo.config';
import {
    authenticateApiKey,
    jsonError,
    jsonValidationError,
    jsonSuccess,
    withServerError,
} from '@/lib/api-auth';
import { readJsonBody, validateLocationIdList } from '@/lib/api-payloads';

// REST equivalent of postBulkDeleteLocations() — src/actions/locations.js
//
//   POST /api/v1/locations/bulk-delete
//   Authorization: Bearer sf_live_...
//   { "location_ids": ["6864f1c2a7b3e10d9c4f2a11", ...] }
//
// POST rather than DELETE because the ID list travels in the body, and a DELETE
// with a body is not reliably forwarded by proxies or by every HTTP client.
//
// `bulk-delete` is a static segment, so Next.js matches it here before it ever
// considers the sibling `[id]` route.
export async function POST(request) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { body, errors: bodyErrors } = await readJsonBody(request);
    if (bodyErrors) return jsonValidationError(bodyErrors);

    const { location_ids, errors } = validateLocationIdList(body);
    if (errors) return jsonValidationError(errors);

    return withServerError(async () => {
        await dbConnect();

        // Authorization: `user_id` in the filter is what scopes the delete to the
        // caller's own records. The dashboard action omits it — it can, because
        // the IDs come from a page the user already owns — but here every ID is
        // attacker-supplied, so IDs belonging to another account simply do not
        // match and are left untouched.
        const result = await LocationModel.deleteMany({
            _id: { $in: location_ids },
            user_id: auth.user_id,
        });

        if (result.deletedCount === 0) {
            return jsonError('No matching locations found.', 404);
        }

        return jsonSuccess(
            `${result.deletedCount} location${result.deletedCount === 1 ? '' : 's'} deleted successfully`,
            { deletedCount: result.deletedCount }
        );
    }, auth);
}
