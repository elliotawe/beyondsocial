"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
    Loader2, Check, User, Bell, Shield, Sparkles, CreditCard,
    Eye, EyeOff, TrendingDown, TrendingUp, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IUser, ICreditTransaction } from "@/lib/types";
import { PLAN_MONTHLY_CREDITS, CREDIT_COSTS } from "@/lib/credit-constants";
import { format } from "date-fns";

type Tab = "general" | "notifications" | "security" | "aidefaults" | "billing";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "general", label: "General", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "aidefaults", label: "AI Defaults", icon: Sparkles },
    { id: "billing", label: "Credits & Billing", icon: CreditCard },
];

interface CreditData {
    credits: number;
    monthlyCreditsUsed: number;
    monthlyLimit: number;
    lastCreditReset: string | null;
    transactions: ICreditTransaction[];
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("general");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<IUser | null>(null);

    // General tab state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    // AI Defaults tab state
    const [aiSettings, setAiSettings] = useState({
        autoHashtags: true,
        smartCaptionLength: true,
        experimentalVideoStyles: false,
    });

    // Notifications tab state
    const [notifSettings, setNotifSettings] = useState({
        email: true,
        push: true,
    });

    // Security tab state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [isChangingPw, setIsChangingPw] = useState(false);

    // Billing tab state
    const [creditData, setCreditData] = useState<CreditData | null>(null);
    const [isCreditLoading, setIsCreditLoading] = useState(false);

    const loadSettings = useCallback(async () => {
        try {
            const res = await fetch("/api/user/settings");
            if (!res.ok) throw new Error("Failed to load settings");
            const data = await res.json();
            const u: IUser = data.user;
            setUser(u);
            setName(u.name || "");
            setEmail(u.email || "");
            if (u.settings) {
                setAiSettings({
                    autoHashtags: u.settings.autoHashtags,
                    smartCaptionLength: u.settings.smartCaptionLength,
                    experimentalVideoStyles: u.settings.experimentalVideoStyles,
                });
                setNotifSettings({
                    email: u.settings.notifications?.email ?? true,
                    push: u.settings.notifications?.push ?? true,
                });
            }
        } catch {
            toast.error("Could not load your preferences.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadCreditData = useCallback(async () => {
        setIsCreditLoading(true);
        try {
            const res = await fetch("/api/credits/history");
            if (!res.ok) throw new Error();
            const data = await res.json();
            setCreditData(data);
        } catch {
            toast.error("Could not load credit history.");
        } finally {
            setIsCreditLoading(false);
        }
    }, []);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    useEffect(() => {
        if (activeTab === "billing" && !creditData) {
            loadCreditData();
        }
    }, [activeTab, creditData, loadCreditData]);

    const handleSaveGeneral = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/user/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
            toast.success("Profile updated successfully.");
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveNotifications = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/user/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    settings: { notifications: notifSettings }
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
            toast.success("Notification preferences saved.");
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to save.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAiDefaults = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/user/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings: aiSettings }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
            toast.success("AI defaults updated.");
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to save.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("New password must be at least 8 characters.");
            return;
        }
        setIsChangingPw(true);
        try {
            const res = await fetch("/api/user/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to change password");
            toast.success("Password changed successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to change password.");
        } finally {
            setIsChangingPw(false);
        }
    };

    const planBadgeClass = {
        free: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
        pro: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        business: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    }[user?.planTier ?? "free"];

    const nextReset = (() => {
        if (creditData?.lastCreditReset) {
            const d = new Date(creditData.lastCreditReset);
            return new Date(d.getFullYear(), d.getMonth() + 1, 1);
        }
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    })();

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
                {/* Sidebar Nav */}
                <div className="lg:col-span-3 space-y-1">
                    <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-1 scrollbar-none">
                        {TABS.map((tab) => (
                            <Button
                                key={tab.id}
                                variant="ghost"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "justify-start gap-3 rounded-xl min-w-fit lg:w-full",
                                    activeTab === tab.id
                                        ? "bg-primary/5 text-primary font-bold hover:bg-primary/10"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-9 space-y-8">
                    {/* ── GENERAL ── */}
                    {activeTab === "general" && (
                        <>
                            <Card className="border-none shadow-sm dark:bg-zinc-900">
                                <CardHeader>
                                    <CardTitle>Profile Details</CardTitle>
                                    <CardDescription>How you appear across the platform.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                                            {name.split(" ").filter(Boolean).map(n => n[0]).join("") || "U"}
                                        </div>
                                        <div className="space-y-1">
                                            <Badge variant="outline" className={cn("text-xs font-bold capitalize", planBadgeClass)}>
                                                {user?.planTier || "free"} Plan
                                            </Badge>
                                            <p className="text-[10px] text-muted-foreground">{user?.credits ?? 0} credits remaining</p>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Display Name</Label>
                                            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input id="email" value={email} disabled className="rounded-xl opacity-60 cursor-not-allowed" />
                                            <p className="text-[10px] text-muted-foreground">Changing email requires re-authentication.</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="flex justify-end gap-3">
                                <Button className="rounded-xl px-10" onClick={handleSaveGeneral} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </div>
                        </>
                    )}

                    {/* ── NOTIFICATIONS ── */}
                    {activeTab === "notifications" && (
                        <>
                            <Card className="border-none shadow-sm dark:bg-zinc-900">
                                <CardHeader>
                                    <CardTitle>Notification Preferences</CardTitle>
                                    <CardDescription>Control how Beyond Social keeps you informed.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Email Notifications</Label>
                                            <p className="text-xs text-muted-foreground">Receive updates on video completion, scheduling, and credits via email.</p>
                                        </div>
                                        <Switch
                                            checked={notifSettings.email}
                                            onCheckedChange={v => setNotifSettings(prev => ({ ...prev, email: v }))}
                                        />
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Push Notifications</Label>
                                            <p className="text-xs text-muted-foreground">Get browser push alerts for important events in real time.</p>
                                        </div>
                                        <Switch
                                            checked={notifSettings.push}
                                            onCheckedChange={v => setNotifSettings(prev => ({ ...prev, push: v }))}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="flex justify-end">
                                <Button className="rounded-xl px-10" onClick={handleSaveNotifications} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                    Save Preferences
                                </Button>
                            </div>
                        </>
                    )}

                    {/* ── SECURITY ── */}
                    {activeTab === "security" && (
                        <>
                            <Card className="border-none shadow-sm dark:bg-zinc-900">
                                <CardHeader>
                                    <CardTitle>Change Password</CardTitle>
                                    <CardDescription>
                                        {user?.password
                                            ? "Update your account password. You will remain logged in after changing it."
                                            : "This account uses Google login. Password management is handled by Google."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {user?.password ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Current Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        type={showCurrentPw ? "text" : "password"}
                                                        value={currentPassword}
                                                        onChange={e => setCurrentPassword(e.target.value)}
                                                        className="rounded-xl pr-10"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCurrentPw(p => !p)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>New Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        type={showNewPw ? "text" : "password"}
                                                        value={newPassword}
                                                        onChange={e => setNewPassword(e.target.value)}
                                                        className="rounded-xl pr-10"
                                                        placeholder="Min. 8 characters"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPw(p => !p)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Confirm New Password</Label>
                                                <Input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    className="rounded-xl"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div className="pt-2">
                                                <Button
                                                    className="rounded-xl px-8"
                                                    onClick={handleChangePassword}
                                                    disabled={isChangingPw || !currentPassword || !newPassword || !confirmPassword}
                                                >
                                                    {isChangingPw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                                                    Update Password
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-8 text-center text-muted-foreground">
                                            <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">Your account is secured through Google OAuth. No password is needed.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* ── AI DEFAULTS ── */}
                    {activeTab === "aidefaults" && (
                        <>
                            <Card className="border-none shadow-sm dark:bg-zinc-900">
                                <CardHeader>
                                    <CardTitle>AI & Content Defaults</CardTitle>
                                    <CardDescription>Pre-configure how the AI generates your content.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Auto-hashtag Generation</Label>
                                            <p className="text-xs text-muted-foreground">Automatically append relevant hashtags to every published post.</p>
                                        </div>
                                        <Switch
                                            checked={aiSettings.autoHashtags}
                                            onCheckedChange={v => setAiSettings(prev => ({ ...prev, autoHashtags: v }))}
                                        />
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Smart Caption Length</Label>
                                            <p className="text-xs text-muted-foreground">Automatically optimise caption length for each target platform.</p>
                                        </div>
                                        <Switch
                                            checked={aiSettings.smartCaptionLength}
                                            onCheckedChange={v => setAiSettings(prev => ({ ...prev, smartCaptionLength: v }))}
                                        />
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Experimental Video Styles</Label>
                                            <p className="text-xs text-muted-foreground">Enable beta cinematic filters and effects during video generation.</p>
                                        </div>
                                        <Switch
                                            checked={aiSettings.experimentalVideoStyles}
                                            onCheckedChange={v => setAiSettings(prev => ({ ...prev, experimentalVideoStyles: v }))}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm dark:bg-zinc-900">
                                <CardHeader>
                                    <CardTitle>AI Credit Costs</CardTitle>
                                    <CardDescription>Credits are deducted each time you use an AI feature.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="divide-y divide-border/40">
                                        {Object.entries(CREDIT_COSTS).map(([key, val]) => (
                                            <div key={key} className="flex items-start justify-between py-4">
                                                <div>
                                                    <p className="text-sm font-semibold">{val.label}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{val.reason}</p>
                                                </div>
                                                <Badge variant="secondary" className="shrink-0 ml-4 font-bold">
                                                    {val.amount} credit{val.amount !== 1 ? "s" : ""}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-end">
                                <Button className="rounded-xl px-10" onClick={handleSaveAiDefaults} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                    Save Defaults
                                </Button>
                            </div>
                        </>
                    )}

                    {/* ── BILLING ── */}
                    {activeTab === "billing" && (
                        <>
                            {isCreditLoading ? (
                                <div className="flex items-center justify-center min-h-[300px]">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : creditData ? (
                                <>
                                    {/* Plan + Credit summary */}
                                    <Card className="border-none shadow-sm dark:bg-zinc-900">
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <div>
                                                <CardTitle>Plan & Credits</CardTitle>
                                                <CardDescription>Your monthly credit allowance and usage.</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={cn("text-sm font-bold capitalize px-3 py-1", planBadgeClass)}>
                                                    {user?.planTier || "free"}
                                                </Badge>
                                                <Button variant="ghost" size="icon" className="rounded-full" onClick={loadCreditData}>
                                                    <RefreshCw className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div className="p-5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Remaining</p>
                                                    <p className="text-3xl font-extrabold font-outfit">{creditData.credits}</p>
                                                    <p className="text-xs text-muted-foreground">of {creditData.monthlyLimit} credits</p>
                                                </div>
                                                <div className="p-5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Used This Month</p>
                                                    <p className="text-3xl font-extrabold font-outfit">{creditData.monthlyCreditsUsed}</p>
                                                    <p className="text-xs text-muted-foreground">credits consumed</p>
                                                </div>
                                                <div className="p-5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resets On</p>
                                                    <p className="text-xl font-extrabold font-outfit">{format(nextReset, "MMM d")}</p>
                                                    <p className="text-xs text-muted-foreground">{format(nextReset, "yyyy")}</p>
                                                </div>
                                            </div>

                                            {/* Usage bar */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                                                    <span>Monthly Usage</span>
                                                    <span>{Math.round((creditData.monthlyCreditsUsed / creditData.monthlyLimit) * 100)}%</span>
                                                </div>
                                                <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden border border-border/20">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-700",
                                                            creditData.monthlyCreditsUsed / creditData.monthlyLimit > 0.8
                                                                ? "bg-red-500"
                                                                : creditData.monthlyCreditsUsed / creditData.monthlyLimit > 0.5
                                                                    ? "bg-amber-500"
                                                                    : "bg-primary"
                                                        )}
                                                        style={{
                                                            width: `${Math.min(100, (creditData.monthlyCreditsUsed / creditData.monthlyLimit) * 100)}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Plan limits table */}
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Available Plans</p>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {Object.entries(PLAN_MONTHLY_CREDITS).map(([plan, limit]) => (
                                                        <div
                                                            key={plan}
                                                            className={cn(
                                                                "p-4 rounded-2xl border text-center space-y-1 transition-all",
                                                                user?.planTier === plan
                                                                    ? "border-primary/40 bg-primary/5"
                                                                    : "border-border/40 bg-muted/20"
                                                            )}
                                                        >
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{plan}</p>
                                                            <p className="text-2xl font-extrabold font-outfit">{limit}</p>
                                                            <p className="text-[10px] text-muted-foreground">credits/mo</p>
                                                            {user?.planTier === plan && (
                                                                <Badge className="text-[9px] bg-primary/10 text-primary border-none">Current</Badge>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Credit history */}
                                    <Card className="border-none shadow-sm dark:bg-zinc-900">
                                        <CardHeader>
                                            <CardTitle>Credit History</CardTitle>
                                            <CardDescription>A full audit trail of every credit event on your account.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {creditData.transactions.length === 0 ? (
                                                <div className="py-12 text-center text-muted-foreground">
                                                    <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                    <p className="text-sm">No credit transactions yet.</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-border/30">
                                                    {creditData.transactions.map(tx => (
                                                        <div key={tx._id} className="flex items-start gap-4 px-6 py-4">
                                                            <div className={cn(
                                                                "shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center",
                                                                tx.amount > 0 ? "bg-emerald-500/10" : "bg-red-500/10"
                                                            )}>
                                                                {tx.amount > 0
                                                                    ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                                                                    : <TrendingDown className="w-4 h-4 text-red-400" />
                                                                }
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold leading-tight">{tx.reason}</p>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                    {format(new Date(tx.createdAt), "MMM d, yyyy • h:mm a")}
                                                                    {" · "}Balance: {tx.balanceBefore} → {tx.balanceAfter}
                                                                </p>
                                                            </div>
                                                            <span className={cn(
                                                                "shrink-0 text-sm font-bold tabular-nums",
                                                                tx.amount > 0 ? "text-emerald-500" : "text-red-400"
                                                            )}>
                                                                {tx.amount > 0 ? "+" : ""}{tx.amount}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </>
                            ) : (
                                <div className="text-center py-16 text-muted-foreground">
                                    <p>Failed to load credit data.</p>
                                    <Button variant="link" onClick={loadCreditData}>Try again</Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
