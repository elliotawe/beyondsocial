import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"

export default {
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        async session({ session, token }: { session: any; token: any }) {
            if (token && session.user) {
                session.user.id = token.sub as string;
                session.user.role = token.role;
                session.user.credits = token.credits;
                session.user.planTier = token.planTier;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role || "user";
                token.credits = (user as any).credits || 0;
                token.planTier = (user as any).planTier || "free";
            }
            return token;
        }
    },
} satisfies NextAuthConfig
