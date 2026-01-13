"use client";

// import { motion } from "framer-motion";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    Instagram,
    Music2,
    Video
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

const schedule = [
    {
        day: "Mon",
        date: "Dec 30",
        items: [
            { time: "09:00 AM", title: "Morning coffee", platform: "Instagram", type: "Reel" },
            { time: "06:30 PM", title: "CRM Advice", platform: "TikTok", type: "Video", suggestion: true }
        ]
    },
    {
        day: "Tue",
        date: "Dec 31",
        items: [
            { time: "11:00 AM", title: "Desk Setup", platform: "Shorts", type: "Video" }
        ]
    },
    {
        day: "Wed",
        date: "Jan 01",
        items: []
    },
    {
        day: "Thu",
        date: "Jan 02",
        items: [
            { time: "07:00 PM", title: "New Year Tip", platform: "TikTok", type: "Video", suggestion: true }
        ]
    }
];

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit">Content Calendar</h1>
                    <p className="text-muted-foreground">Manage your posting schedule and peak engagement times.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl">Week View</Button>
                    <Button className="rounded-xl" asChild>
                        <Link href="/dashboard/create">
                            <Plus className="w-4 h-4 mr-2" />
                            Schedule Post
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-sm dark:bg-zinc-900 overflow-hidden">
                        <CardContent className="p-4">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border-none"
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-primary/5 border border-primary/10 rounded-3xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                Optimal Times
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Based on your industry (SaaS/Freelance), the best times to post this week are:
                            </p>
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span>Weekdays</span>
                                    <Badge variant="secondary">08:00 AM - 10:00 AM</Badge>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span>Weekends</span>
                                    <Badge variant="secondary">07:00 PM - 09:00 PM</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    {schedule.map((day, i) => (
                        <div key={day.date} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <h3 className="font-bold text-lg">{day.day}, {day.date}</h3>
                                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                            </div>
                            {day.items.length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {day.items.map((item, j) => (
                                        <Link
                                            key={j}
                                            href="/dashboard/create"
                                            className={`p-4 rounded-2xl border flex items-center gap-4 group transition-all hover:scale-[1.02] ${item.suggestion
                                                ? "bg-primary/5 border-primary/20 hover:border-primary/40"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.platform === 'TikTok' ? 'bg-zinc-950 text-white' :
                                                item.platform === 'Instagram' ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white' :
                                                    'bg-red-600 text-white'
                                                }`}>
                                                {item.platform === 'Instagram' ? <Instagram className="w-6 h-6" /> :
                                                    item.platform === 'TikTok' ? <Music2 className="w-6 h-6" /> :
                                                        <Video className="w-6 h-6" />}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-xs font-mono font-medium text-zinc-400">{item.time}</span>
                                                    {item.suggestion && <Badge className="text-[8px] h-4 bg-primary/20 text-primary border-none">AI Pick</Badge>}
                                                </div>
                                                <p className="font-semibold text-sm truncate">{item.title}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.type}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                                    <p className="text-sm text-muted-foreground mb-4">No posts scheduled for this day.</p>
                                    <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                                        <Link href="/dashboard/create">
                                            <Plus className="w-3 h-3 mr-2" />
                                            Quick Add
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
