import NextAuth from "next-auth"
import authConfig from "./auth.config"

const { auth } = NextAuth(authConfig)
import { NextResponse } from "next/server"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard")
    const isOnAdmin = req.nextUrl.pathname.startsWith("/admin")
    const isOnLogin = req.nextUrl.pathname.startsWith("/login")

    if (isOnAdmin) {
        if (isLoggedIn && (req.auth?.user as { role?: string })?.role === "admin") return NextResponse.next()
        if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        return NextResponse.redirect(new URL("/login", req.nextUrl))
    }

    if (isOnDashboard) {
        if (isLoggedIn) return NextResponse.next()
        return NextResponse.redirect(new URL("/login", req.nextUrl))
    }

    if (isOnLogin) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
