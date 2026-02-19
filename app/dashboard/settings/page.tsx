"use client";

import { useState, useEffect } from "react";
import { getUserSettings, updateUserSettings } from "@/app/actions/user";
import { toast } from "sonner"
import { Loader2, Check, User, Bell, Shield, Palette, CreditCard, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [settings, setSettings] = useState({
        autoHashtags: true,
        smartCaptionLength: true,
        experimentalVideoStyles: false,
        notifications: {
            email: true,
            push: true
        }
    });

    useEffect(() => {
        async function loadSettings() {
            try {
                const data = await getUserSettings();
                if (data) {
                    setName(data.name || "");
                    setEmail(data.email || "");
                    if (data.settings) {
                        setSettings(data.settings);
                    }
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            } finally {
                setIsLoading(false);
            }
        }
        loadSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateUserSettings({
                name,
                settings
            });
            if (result.success) {
                toast.success("Your preferences have been updated successfully.");
            }
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        window.location.reload();
    };

    const navItems = [
        { name: "General", icon: User, active: true },
        { name: "Notifications", icon: Bell },
        { name: "Security", icon: Shield },
        { name: "Appearance", icon: Palette },
        { name: "Platform Defaults", icon: Sparkles },
        { name: "Billing", icon: CreditCard },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit">Settings</h1>
                <p className="text-muted-foreground">Manage your account and platform preferences.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Lateral Nav */}
                <div className="lg:col-span-3 space-y-1">
                    <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-1 scrollbar-none">
                        {navItems.map((item) => (
                            <Button
                                key={item.name}
                                variant="ghost"
                                className={`justify-start gap-3 rounded-xl min-w-fit lg:w-full ${item.active
                                    ? "bg-primary/5 text-primary font-bold hover:bg-primary/10"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.name}
                            </Button>
                        ))}
                    </div>
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
                                    {name.split(' ').filter(Boolean).map(n => n[0]).join('') || "U"}
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
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="rounded-xl border-zinc-200 dark:border-zinc-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        value={email}
                                        disabled
                                        className="rounded-xl border-zinc-200 dark:border-zinc-800 opacity-60 cursor-not-allowed"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Changing email requires re-authentication.</p>
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
                                <Switch
                                    checked={settings.autoHashtags}
                                    onCheckedChange={(checked) => setSettings({ ...settings, autoHashtags: checked })}
                                />
                            </div>
                            <Separator className="bg-zinc-100 dark:bg-zinc-800" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Smart Caption Length</Label>
                                    <p className="text-xs text-muted-foreground">Optimize captions based on specific platform limits.</p>
                                </div>
                                <Switch
                                    checked={settings.smartCaptionLength}
                                    onCheckedChange={(checked) => setSettings({ ...settings, smartCaptionLength: checked })}
                                />
                            </div>
                            <Separator className="bg-zinc-100 dark:bg-zinc-800" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Experimental Video Styles</Label>
                                    <p className="text-xs text-muted-foreground">Enable beta cinematic filters for video generation.</p>
                                </div>
                                <Switch
                                    checked={settings.experimentalVideoStyles}
                                    onCheckedChange={(checked) => setSettings({ ...settings, experimentalVideoStyles: checked })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            className="rounded-xl px-8"
                            onClick={handleReset}
                        >
                            Reset Changes
                        </Button>
                        <Button
                            className="rounded-xl px-10 shadow-xl shadow-primary/20"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    Save Changes
                                    <Check className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
