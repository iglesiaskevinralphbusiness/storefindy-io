import { LocationModel } from '@/mongo';
import { dbConnect } from '@/config/mongo.config';
import {
    authenticateApiKey,
    jsonError,
    jsonValidationError,
    jsonSuccess,
    withServerError,
} from '@/lib/api-auth';
import { readJsonBody, validateLocationIdList, validatePublishAction } from '@/lib/api-payloads';

// REST equivalent of postBulkPublishLocations() — src/actions/locations.js
//
//   POST /api/v1/locations/bulk-publish
//   Authorization: Bearer sf_live_...
//   { "location_ids": ["6864f1c2a7b3e10d9c4f2a11", ...], "action": "publish" }
//
// See bulk-delete for why this is a POST with the IDs in the body.
export async function POST(request) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { body, errors: bodyErrors } = await readJsonBody(request);
    if (bodyErrors) return jsonValidationError(bodyErrors);

    const { location_ids, errors: idErrors } = validateLocationIdList(body);
    if (idErrors) return jsonValidationError(idErrors);

    const { action, published, errors: actionErrors } = validatePublishAction(body);
    if (actionErrors) return jsonValidationError(actionErrors);

    return withServerError(async () => {
        await dbConnect();

        // Authorization: `user_id` scopes every query below to the caller's own
        // records — see the note in bulk-delete.
        const owned = { _id: { $in: location_ids }, user_id: auth.user_id };

        // Rows that are already in the requested state are counted out first, so
        // the message reports what actually changed rather than how many IDs were
        // sent. Same two-step the dashboard action does.
        const pending = await LocationModel.countDocuments({ ...owned, published: !published });

        if (pending === 0) {
            // Nothing to change: either none of the IDs belong to this account, or
            // they are all already in the requested state. Told apart with one more
            // count so the caller gets the right reason.
            const matched = await LocationModel.countDocuments(owned);

            if (matched === 0) {
                return jsonError('No matching locations found.', 404);
            }

            return jsonError(`The selected locations are already ${action}ed.`, 400);
        }

        const result = await LocationModel.updateMany(owned, { published });

        return jsonSuccess(
            `${pending} location${pending === 1 ? '' : 's'} ${action}ed successfully`,
            { modifiedCount: result.modifiedCount }
        );
    }, auth);
}
