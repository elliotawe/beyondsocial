import NextAuth from "next-auth"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"
import authConfig from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import connectDB from "@/lib/db"
import { User } from "@/models/User"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: MongoDBAdapter(clientPromise),
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    ...authConfig,
    providers: [
        ...authConfig.providers,
        Credentials({
            async authorize(credentials) {
                const { email, password } = credentials as Record<string, string>;

                if (!email || !password) return null;

                await connectDB();
                const user = await User.findOne({ email });

                if (!user || !user.password) return null;

                const passwordsMatch = await bcrypt.compare(password, user.password);

                if (passwordsMatch) {
                    return {
                        id: user._id.toString(),
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        credits: user.credits,
                        planTier: user.planTier,
                    };
                }

                return null;
            },
        }),
    ],
})
