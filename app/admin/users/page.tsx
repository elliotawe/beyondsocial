import { auth } from "@/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import { getAllUsers } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    MoreHorizontal,
    Mail,
    Calendar,
    Shield,
    CreditCard,
    ArrowUpDown,
    Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

export default async function UserManagementPage() {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    await connectDB();
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser || currentUser.role !== "admin") redirect("/dashboard");

    const users = await getAllUsers();

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">User Management</h1>
                    <p className="text-muted-foreground">Monitor accounts, adjust credits, and manage platform roles.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Sort
                    </Button>
                    <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-sm dark:bg-zinc-900/50">
                <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Search by name or email..." className="pl-9 h-9" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Displaying <span className="font-bold text-foreground">{users.length}</span> platform users
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/50 bg-muted/30">
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">User</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Plan & Role</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Credits</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {users.map((user: any) => (
                                    <tr key={user._id} className="hover:bg-muted/10 transition-colors">
                                        <td className="p-4 text-sm">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {user.name?.[0] || user.email[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{user.name || "Anonymous"}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center">
                                                        <Mail className="w-3 h-3 mr-1 opacity-50" />
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] py-0 h-4 uppercase font-bold tracking-wider">
                                                        {user.planTier}
                                                    </Badge>
                                                    {user.role === "admin" && (
                                                        <Badge className="text-[10px] py-0 h-4 bg-purple-500/10 text-purple-500 border-purple-500/20 uppercase font-bold tracking-wider">
                                                            <Shield className="w-2.5 h-2.5 mr-1" />
                                                            Admin
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground flex items-center">
                                                    <Calendar className="w-2.5 h-2.5 mr-1 opacity-50" />
                                                    Joined {new Date(user.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-full max-w-[80px] h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary"
                                                        style={{ width: `${Math.min(100, (user.credits / 50) * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="font-mono text-xs">{user.credits}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
