import { LocationModel } from '@/mongo';
import { dbConnect } from '@/config/mongo.config';
import {
    authenticateApiKey,
    jsonValidationError,
    jsonSuccess,
    requireOwnedLocation,
    withServerError,
} from '@/lib/api-auth';
import { readJsonBody, validatePublishAction } from '@/lib/api-payloads';

// REST equivalent of postPublishLocation() — src/actions/locations.js
//
//   POST /api/v1/locations/:id/publish
//   Authorization: Bearer sf_live_...
//   { "action": "publish" | "unpublish" }
//
// `published` is also writable through PUT /locations/:id, but that route runs
// the full partial-update validator. This one exists so a list screen can flip
// one row's visibility with a two-key body and no risk of touching anything
// else on the document.
export async function POST(request, { params }) {
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    // Authorization: scoped to the caller's own locations.
    const owned = await requireOwnedLocation(auth.user_id, id);
    if (owned.error) return owned.error;

    const { body, errors: bodyErrors } = await readJsonBody(request);
    if (bodyErrors) return jsonValidationError(bodyErrors);

    const { action, published, errors } = validatePublishAction(body);
    if (errors) return jsonValidationError(errors);

    return withServerError(async () => {
        await dbConnect();
        await LocationModel.findByIdAndUpdate(id, { published });
        // The action reports "published successfully" for both directions; the
        // message here follows what was actually asked for.
        return jsonSuccess(`Location ${action}ed successfully`);
    }, auth);
}
