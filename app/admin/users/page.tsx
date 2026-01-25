"use client";

import { useAuth } from "@/lib/auth-context";
import {
    Users,
    Activity,
    Terminal,
    ShieldAlert,
    Database,
    Search,
    MoreVertical,
    ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function UserManagement() {
    const users = [
        { name: "Elliot Evans", email: "elliot@posta.io", role: "Admin", status: "Active" },
        { name: "Sarah Chen", email: "sarah@posta.io", role: "Creator", status: "Active" },
        { name: "Marcus Thorne", email: "marcus@posta.io", role: "Viewer", status: "Inactive" },
        { name: "Aria Vane", email: "aria@posta.io", role: "Creator", status: "Active" },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit">User Management</h1>
                    <p className="text-muted-foreground">Manage internal staff, creators, and platform permissions.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl">Export List</Button>
                    <Button className="rounded-xl">Add New User</Button>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                <Card className="lg:col-span-12 border-none shadow-sm dark:bg-zinc-900 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-xl">Platform Directory</CardTitle>
                            <CardDescription>All users registered on Beyond Social.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Search users by name or email..." className="pl-9 rounded-xl h-9 text-xs" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase text-[10px] font-bold tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Last Active</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {users.map((u, i) => (
                                        <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{u.name}</span>
                                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="rounded-md font-mono text-[10px]">{u.role}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", u.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-300')} />
                                                    <span className="text-xs">{u.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-muted-foreground">
                                                2 hours ago
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="icon" className="rounded-full">
                                                    <MoreVertical className="w-4 h-4 text-zinc-400" />
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
        </div>
    );
}
