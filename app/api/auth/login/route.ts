import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { z } from "zod";

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = LoginSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
        }

        const { email, password } = result.data;

        // signIn in NextAuth v5 can be called with a plain object in server context
        // It will return the redirect URL or throw an error.
        try {
            await signIn("credentials", {
                email,
                password,
                redirect: false, // We want to handle response ourselves
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            if (error instanceof AuthError) {
                switch (error.type) {
                    case "CredentialsSignin":
                        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
                    default:
                        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
                }
            }
            // If it's a redirect error (success in some cases), handle it
            if ((error as Error).message?.includes("NEXT_REDIRECT")) {
                return NextResponse.json({ success: true });
            }
            throw error;
        }
    } catch (error) {
        console.error("[API Auth Login] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
