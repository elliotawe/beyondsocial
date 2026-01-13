"use client";

import { useAuth } from "@/lib/auth-context";
import {
    User,
    Bell,
    Shield,
    Palette,
    CreditCard,
    Sparkles,
    Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
    const { user } = useAuth();

    if (!user) return null;

    const navItems = [
        { name: "General", icon: User, active: true },
        { name: "Notifications", icon: Bell },
        { name: "Security", icon: Shield },
        { name: "Appearance", icon: Palette },
        { name: "Platform Defaults", icon: Sparkles },
        { name: "Billing", icon: CreditCard },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 mt-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit">Settings</h1>
                <p className="text-muted-foreground">Manage your account and platform preferences.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Lateral Nav */}
                <div className="lg:col-span-3 space-y-1">
                    {navItems.map((item) => (
                        <Button
                            key={item.name}
                            variant="ghost"
                            className={`w-full justify-start gap-3 rounded-xl ${item.active
                                ? "bg-primary/5 text-primary font-bold hover:bg-primary/10"
                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.name}
                        </Button>
                    ))}
                </div>

                {/* Main Content */}
                <div className="lg:col-span-9 space-y-8">
                    {/* Profile Section */}
                    <Card className="border-none shadow-sm dark:bg-zinc-900">
                        <CardHeader>
                            <CardTitle>Profile Details</CardTitle>
                            <CardDescription>How you appear to your team.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-2 border-primary/5">
                                    {(user.name || "User").split(' ').filter(Boolean).map(n => n[0]).join('')}
                                </div>
                                <div className="space-y-2">
                                    <Button className="rounded-xl shadow-lg shadow-primary/10">Change Avatar</Button>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Square JPG, PNG, up to 1MB</p>
                                </div>
                            </div>

                            <Separator className="bg-zinc-100 dark:bg-zinc-800" />

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Display Name</Label>
                                    <Input id="name" defaultValue={user.name} className="rounded-xl border-zinc-200 dark:border-zinc-800" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" defaultValue={user.email} className="rounded-xl border-zinc-200 dark:border-zinc-800" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI & Platform Defaults */}
                    <Card className="border-none shadow-sm dark:bg-zinc-900">
                        <CardHeader>
                            <CardTitle>AI & Platform Defaults</CardTitle>
                            <CardDescription>Pre-configure how AI generates your content.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Auto-hashtag Generation</Label>
                                    <p className="text-xs text-muted-foreground">Posta will automatically add relevant hashtags.</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <Separator className="bg-zinc-100 dark:bg-zinc-800" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Smart Caption Length</Label>
                                    <p className="text-xs text-muted-foreground">Optimize captions based on specific platform limits.</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <Separator className="bg-zinc-100 dark:bg-zinc-800" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Experimental Video Styles</Label>
                                    <p className="text-xs text-muted-foreground">Enable beta cinematic filters for video generation.</p>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" className="rounded-xl px-8">Reset Defaults</Button>
                        <Button className="rounded-xl px-10 shadow-xl shadow-primary/20">
                            Save Changes
                            <Check className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

