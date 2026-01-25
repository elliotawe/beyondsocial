"use client";

import { useAuth } from "@/lib/auth-context";
import { User, Shield, Bell, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSettings() {
    const { user } = useAuth();

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-1">Admin Profile Settings</h1>
                <p className="text-muted-foreground">Manage your account preferences and security as an administrator.</p>
            </div>

            <Card className="border-none shadow-sm dark:bg-zinc-900">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Personal Information
                    </CardTitle>
                    <CardDescription>Update your name, email, and avatar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                            {user?.name?.[0] || 'A'}
                        </div>
                        <Button variant="outline" size="sm">Change Avatar</Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" defaultValue={user?.name || "Admin User"} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" defaultValue={user?.email || "admin@example.com"} className="rounded-xl" />
                        </div>
                    </div>
                    <Button className="rounded-xl px-8">Save Changes</Button>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm dark:bg-zinc-900">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        Admin Role & Permissions
                    </CardTitle>
                    <CardDescription>Your current administrative privileges.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-emerald-600">Super Admin</p>
                            <p className="text-xs text-emerald-600/70">Full access to all platform settings and user data.</p>
                        </div>
                        <Lock className="w-4 h-4 text-emerald-500" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm dark:bg-zinc-900">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-amber-500" />
                        Notification Preferences
                    </CardTitle>
                    <CardDescription>Configure alerts for platform events.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        "New high-priority support ticket",
                        "System performance threshold reached",
                        "Failed login attempts (Security Alert)",
                        "Daily platform health summary"
                    ].map((pref, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-50 dark:border-zinc-800 last:border-0">
                            <span className="text-sm">{pref}</span>
                            <div className="w-10 h-5 bg-primary/20 rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-0.5 w-4 h-4 bg-primary rounded-full" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
