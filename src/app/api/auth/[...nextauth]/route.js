import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { dbConnect } from '@/config/mongo.config';
import { UserModel } from '@/mongo';

export const authOptions = {
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
			if (account?.provider !== 'google' || !user?.email) {
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
					provider: 'google',
					provider_id: account.providerAccountId,
					created_at: nowIso,
					last_login_at: nowIso,
				});
			}

			return true;
		},
		async jwt({ token, user }) {
			if (user?.email) {
				await dbConnect();
				const dbUser = await UserModel.findOne({ email: user.email });
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
