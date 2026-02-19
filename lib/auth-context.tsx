"use client";

import React, { createContext, useContext, useMemo } from "react";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
// import { useRouter } from "next/navigation";

export type Role = "admin" | "creator" | "viewer";

interface AuthContextType {
    user: {
        role: Role;
        name: string;
        email: string;
        image?: string;
        credits: number;
        planTier: string;
    } | null;
    login: (provider?: string) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthContextContent({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    // const router = useRouter();
    const user = useMemo(() => {
        if (!session?.user) return null;

        const u = session.user as {
            role?: Role;
            name?: string;
            email?: string;
            image?: string;
            credits?: number;
            planTier?: string;
        };

        return {
            role: u.role || "creator",
            name: u.name || "User",
            email: u.email || "",
            image: u.image || undefined,
            credits: u.credits || 0,
            planTier: u.planTier || "free"
        };
    }, [session]);

    const login = async (provider?: string) => {
        await signIn(provider || "google");
    };

    const logout = async () => {
        await signOut({ callbackUrl: "/login" });
    };

    const isLoading = status === "loading";

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AuthContextContent>{children}</AuthContextContent>
        </SessionProvider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
