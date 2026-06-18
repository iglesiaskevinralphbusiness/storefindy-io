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
    if (!session?.user?.id) return null;

    await dbConnect();
    return UserModel.findById(session.user.id);
}
