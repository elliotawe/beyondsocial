"use server";

import connectDB from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function signUp(formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        if (!email || !password) {
            return { error: "Email and password are required." };
        }

        await connectDB();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { error: "User already exists with this email." };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            name,
            email,
            password: hashedPassword,
            credits: 5, // Initial free credits
            role: "user",
            planTier: "free"
        });

        return { success: "Account created successfully! You can now log in." };
    } catch (error) {
        console.error("SignUp Error:", error);
        return { error: "Something went wrong. Please try again." };
    }
}

export async function loginWithCredentials(formData: FormData) {
    try {
        await signIn("credentials", formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid credentials." };
                default:
                    return { error: "Something went wrong." };
            }
        }
        throw error;
    }
}
