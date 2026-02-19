"use client";

import {
    MessageCircle,
    Clock,
    User,
    MoreHorizontal,
    Search,
    Filter,
    CheckCircle,
    AlertCircle,
    // Mail // Mail was imported but not used, and the instruction suggests commenting it out or removing it.
    // MessageSquare, // New icon suggested, but not used in the current code.
    // Shield // New icon suggested, but not used in the current code.
} from "lucide-react";
import { Card, CardContent, CardHeader /*, CardTitle, CardDescription */ } from "@/components/ui/card"; // Keep all Card components as they are used
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CustomerSupport() {
    const tickets = [
        { id: "BS-1402", user: "John Doe", subject: "Video generation failed", priority: "High", status: "Open", time: "25m ago" },
        { id: "BS-1399", user: "Alice Smith", subject: "Subscription billing inquiry", priority: "Medium", status: "In Progress", time: "2h ago" },
        { id: "BS-1395", user: "Robert Chen", subject: "API documentation question", priority: "Low", status: "Resolved", time: "1d ago" },
        { id: "BS-1392", user: "Maria Garcia", subject: "Requesting refund on trial", priority: "High", status: "Open", time: "3h ago" },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Customer Support</h1>
                    <p className="text-muted-foreground">Monitor user inquiries and resolve technical issues.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl gap-2">
                        <Filter className="w-4 h-4" />
                        Filter
                    </Button>
                    <Button className="rounded-xl gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Start Chat
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                {[
                    { label: "Open Tickets", value: "24", icon: MessageCircle, color: "text-blue-500" },
                    { label: "Avg. Response Time", value: "1.4h", icon: Clock, color: "text-amber-500" },
                    { label: "Resolved Today", value: "142", icon: CheckCircle, color: "text-emerald-500" },
                    { label: "Escalated", value: "3", icon: AlertCircle, color: "text-red-500" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm dark:bg-zinc-900">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className={cn("p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800", stat.color)}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-sm dark:bg-zinc-900 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div className="relative w-96 font-outfit">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground " />
                        <Input placeholder="Search tickets, users, or keywords..." className="pl-9 rounded-xl h-10" />
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">All</Badge>
                        <Badge variant="outline" className="rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">Open</Badge>
                        <Badge variant="outline" className="rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">Resolved</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {tickets.map((ticket, i) => (
                            <div key={i} className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer group">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="mt-1">
                                        {ticket.status === 'Open' ? (
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-zinc-300" />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
                                            <h3 className="text-sm font-bold group-hover:text-primary transition-colors">{ticket.subject}</h3>
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] h-5 rounded-md",
                                                ticket.priority === 'High' ? "border-red-200 bg-red-50 text-red-500" :
                                                    ticket.priority === 'Medium' ? "border-amber-200 bg-amber-50 text-amber-500" :
                                                        "border-zinc-200 bg-zinc-50 text-zinc-500"
                                            )}>
                                                {ticket.priority}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {ticket.user}
                                            </span>
                                            <span className="text-zinc-300">|</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {ticket.time}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className={cn(
                                        "text-[10px] h-6 px-3 rounded-full",
                                        ticket.status === 'Open' ? "border-blue-500 text-blue-500" :
                                            ticket.status === 'In Progress' ? "border-amber-500 text-amber-500" :
                                                "border-emerald-500 text-emerald-500"
                                    )}>
                                        {ticket.status}
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                        <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
                        <Button variant="ghost" className="text-xs text-muted-foreground">Load more tickets...</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
