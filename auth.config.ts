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
        /* eslint-disable @typescript-eslint/no-explicit-any */
        async session({ session, token }: { session: any; token: any }) {
            if (token && session.user) {
                const s = session as { user: { id?: string; role?: string; credits?: number; planTier?: string } };
                s.user.id = (token.sub as string) || "";
                s.user.role = (token.role as string) || "creator";
                s.user.credits = (token.credits as number) || 0;
                s.user.planTier = (token.planTier as string) || "free";
            }
            return session;
        },
        async jwt({ token, user }: { token: Record<string, unknown>; user?: unknown }) {
            if (user) {
                const t = token as { role?: string; credits?: number; planTier?: string };
                const u = user as { role?: string; credits?: number; planTier?: string };
                t.role = u.role || "creator";
                t.credits = u.credits || 0;
                t.planTier = u.planTier || "free";
            }
            return token;
        }
        /* eslint-enable @typescript-eslint/no-explicit-any */
    },
} satisfies NextAuthConfig
