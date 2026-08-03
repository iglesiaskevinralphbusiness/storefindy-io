import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { dbConnect } from '@/config/mongo.config';
import { UserModel } from '@/mongo';

// Providers we allow to create/sign in accounts.
const ALLOWED_PROVIDERS = new Set(['google', 'github']);

/** @type {import('next-auth').AuthOptions} */
export const authOptions = {
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		}),
		GitHubProvider({
			clientId: process.env.GITHUB_CLIENT_ID,
			clientSecret: process.env.GITHUB_CLIENT_SECRET,
			// Ask for the user's email even when it is set to private on GitHub,
			// so the `signIn` callback below always has an email to key on.
			authorization: { params: { scope: 'read:user user:email' } },
		}),
	],
	secret: process.env.NEXTAUTH_SECRET,
	session: {
		strategy: 'jwt',
	},
	pages: {
		signIn: '/sign-in',
	},
	callbacks: {
		async signIn({ user, account }) {
			if (!account || !ALLOWED_PROVIDERS.has(account.provider) || !user?.email) {
				return false;
			}

			await dbConnect();

			const nowIso = new Date().toISOString();
			const existing = await UserModel.findOne({ email: user.email });

			if (existing) {
				existing.last_login_at = nowIso;
				if (!existing.provider_id && account.providerAccountId) {
					existing.provider_id = account.providerAccountId;
				}
				await existing.save();
			} else {
				await UserModel.create({
					email: user.email,
					provider: account.provider,
					provider_id: account.providerAccountId,
					created_at: nowIso,
					last_login_at: nowIso,
				});
			}

			return true;
		},
		async jwt({ token, user }) {
			// Backfill the account id whenever it is missing — on initial
			// sign-in (`user` present) and for older cookies whose token was
			// issued before this callback set `id`, so they self-heal instead
			// of leaving `session.user.id` undefined forever.
			const email = user?.email || token.email;
			if (email && !token.id) {
				await dbConnect();
				const dbUser = await UserModel.findOne({ email });
				if (dbUser) {
					token.id = dbUser._id.toString();
					token.email = dbUser.email;
				}
			}
			return token;
		},
		async session({ session, token }) {
			if (token) {
				session.user = {
					...(session.user || {}),
					id: token.id,
					email: token.email,
				};
			}
			return session;
		},
	},
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
