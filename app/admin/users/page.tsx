"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    MoreHorizontal,
    Mail,
    Calendar,
    Shield,
    ArrowUpDown,
    Filter,
    Loader2,
    Plus,
    Minus
} from "lucide-react";
import { toast } from "sonner";
import { IUser } from "@/lib/types";

export default function UserManagementPage() {
    const [users, setUsers] = useState<IUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users");
            if (!res.ok) throw new Error("Failed to fetch users");
            const data = await res.json();
            setUsers(data.users);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load users");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUpdateCredits = async (userId: string, currentCredits: number, delta: number) => {
        const newCredits = Math.max(0, currentCredits + delta);
        try {
            const res = await fetch("/api/admin/users/credits", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, newCredits }),
            });

            if (!res.ok) throw new Error("Update failed");
            
            setUsers(users.map(u => u._id === userId ? { ...u, credits: newCredits } : u));
            toast.success("Credits updated");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update credits");
        }
    };

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 font-outfit uppercase italic">User Management</h1>
                    <p className="text-muted-foreground">Monitor accounts, adjust credits, and manage platform roles.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl border-border/40">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Sort
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl border-border/40">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </Button>
                </div>
            </div>

            <Card className="border border-border/40 shadow-sm bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40 bg-card/30">
                    <div className="flex items-center justify-between">
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or email..." 
                                className="pl-9 h-10 rounded-xl bg-background/50 border-border/40" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">
                            Displaying <span className="font-bold text-foreground">{filteredUsers.length}</span> platform users
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/30 bg-muted/20">
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/60">User</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Plan & Role</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Credits</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/60 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {filteredUsers.map((user: IUser) => (
                                    <tr key={user._id} className="hover:bg-primary/5 transition-colors group">
                                        <td className="p-4 text-sm">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-sm group-hover:scale-105 transition-transform">
                                                    {user.name?.[0] || user.email[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold group-hover:text-primary transition-colors">{user.name || "Anonymous Cluster"}</p>
                                                    <p className="text-[10px] text-muted-foreground flex items-center uppercase tracking-wider font-medium">
                                                        <Mail className="w-3 h-3 mr-1 opacity-50" />
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] py-0 h-5 border-none bg-primary/5 text-primary uppercase font-black tracking-widest">
                                                        {user.planTier}
                                                    </Badge>
                                                    {user.role === "admin" && (
                                                        <Badge className="text-[10px] py-0 h-5 bg-purple-500/10 text-purple-500 border-none uppercase font-black tracking-widest">
                                                            <Shield className="w-2.5 h-2.5 mr-1" />
                                                            Admin
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground flex items-center font-bold uppercase tracking-widest opacity-60">
                                                    <Calendar className="w-2.5 h-2.5 mr-1 opacity-50" />
                                                    Joined {new Date(user.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 rounded-lg hover:bg-red-500/10 hover:text-red-500"
                                                            onClick={() => handleUpdateCredits(user._id, user.credits, -1)}
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </Button>
                                                        <span className="font-mono font-bold text-sm min-w-[2ch] text-center">{user.credits}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500"
                                                            onClick={() => handleUpdateCredits(user._id, user.credits, 1)}
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                    <p className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest pl-1">
                                                        {user.monthlyCreditsUsed ?? 0} used / {user.planTier === "business" ? 200 : user.planTier === "pro" ? 60 : 15} mo
                                                    </p>
                                                </div>
                                                <div className="hidden md:block w-full max-w-[60px] h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary opacity-50"
                                                        style={{ width: `${Math.min(100, (user.credits / (user.planTier === "business" ? 200 : user.planTier === "pro" ? 60 : 15)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
