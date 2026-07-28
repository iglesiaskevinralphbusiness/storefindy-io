import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbConnect } from '@/config/mongo.config';
import { UserModel } from '@/mongo';

/*
 * Resolve the signed-in account into its UserModel document for use inside API
 * route handlers. Returns the mongoose document, or null when there is no valid
 * session (the caller decides how to respond — usually 401).
 */
export async function getSessionUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    await dbConnect();

    // Prefer the account id baked into the JWT. Older session cookies (issued
    // before the jwt/session callbacks set `id`) only carry the email, so fall
    // back to that instead of failing the request with a 401.
    if (session.user.id) {
        const byId = await UserModel.findById(session.user.id);
        if (byId) return byId;
    }
    if (session.user.email) {
        return UserModel.findOne({ email: session.user.email });
    }
    return null;
}
