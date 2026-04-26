"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Calendar as CalendarIcon,
    Play,
    Loader2,
    Sparkles
} from "lucide-react";
import Link from "next/link";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    parseISO,
    addMonths,
    subMonths,
} from "date-fns";
import { toast } from "sonner";

interface CalendarEvent {
    _id: string;
    title: string;
    date: Date;
    status: string;
    thumbnail: string | null;
}

export default function ContentCalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const today = new Date();

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/projects/calendar");
            if (!res.ok) throw new Error("Failed to fetch calendar events");
            const data = await res.json();
            const parsedEvents = data.events.map((e: {
                _id: string;
                title: string;
                date: string;
                status: string;
                thumbnail: string | null;
            }) => ({ ...e, date: parseISO(e.date) }));
            setEvents(parsedEvents);
        } catch {
            toast.error("Failed to load calendar events");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const prevMonth = () => setCurrentMonth(m => subMonths(m, 1));
    const nextMonth = () => setCurrentMonth(m => addMonths(m, 1));
    const goToToday = () => setCurrentMonth(new Date());

    const upcomingScheduled = events
        .filter(e => e.date >= today && e.status === "scheduled")
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit">Content Calendar</h1>
                    <p className="text-muted-foreground">Plan and track your social media presence.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild className="rounded-xl">
                        <Link href="/dashboard/projects">View All Projects</Link>
                    </Button>
                    <Button asChild size="sm" className="rounded-xl">
                        <Link href="/dashboard/create">
                            <Plus className="w-4 h-4 mr-2" />
                            Create New
                        </Link>
                    </Button>
                </div>
            </div>

            <Card className="border-border shadow-sm overflow-hidden rounded-[32px]">
                <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between py-6 px-8">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-2xl bg-primary/10">
                            <CalendarIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold font-outfit">
                                {format(currentMonth, "MMMM yyyy")}
                            </h2>
                            {!isSameMonth(currentMonth, today) && (
                                <Button variant="ghost" size="sm" onClick={goToToday} className="rounded-full text-xs font-bold text-primary h-7 px-3">
                                    Today
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full hover:bg-primary/10">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full hover:bg-primary/10">
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-7 border-b bg-muted/10">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <div key={day} className="py-4 text-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, idx) => {
                            const dayEvents = events.filter(e => isSameDay(e.date, day));
                            const isToday = isSameDay(day, today);
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <div
                                    key={idx}
                                    className={`min-h-[140px] p-3 border-r border-b last:border-r-0 transition-colors ${!isCurrentMonth ? "bg-muted/5 opacity-40" : ""} ${isToday ? "bg-primary/5" : "hover:bg-muted/10 cursor-pointer"}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-xl ${isToday ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground"}`}>
                                            {format(day, "d")}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {dayEvents.map(event => (
                                            <Link
                                                key={event._id}
                                                href={`/dashboard/projects/${event._id}`}
                                                className="block p-1.5 bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl shadow-sm text-[10px] truncate hover:border-primary/50 transition-all group scale-100 hover:scale-[1.02]"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`shrink-0 w-2 h-2 rounded-full ${event.status === "posted" ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"}`} />
                                                    <span className="truncate group-hover:text-primary font-bold">{event.title}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-8 md:grid-cols-3">
                <Card className="md:col-span-2 border-border/40 shadow-sm rounded-[32px] overflow-hidden bg-card/50 backdrop-blur-sm">
                    <CardHeader className="py-8 px-8">
                        <CardTitle className="text-xl font-bold font-outfit">Upcoming Schedule</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-8 pb-8">
                        {upcomingScheduled.length > 0 ? (
                            upcomingScheduled.map(event => (
                                <div key={event._id} className="flex items-center gap-5 p-5 rounded-[24px] bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors group">
                                    <div className="w-16 h-16 rounded-[18px] bg-background flex items-center justify-center overflow-hidden border border-border/50 relative">
                                        {event.thumbnail ? (
                                            <Image src={event.thumbnail} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" alt={event.title} width={64} height={64} />
                                        ) : (
                                            <Play className="w-5 h-5 text-muted-foreground/40" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-base font-bold group-hover:text-primary transition-colors">{event.title}</p>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-blue-500/5 text-blue-500 border-none px-2 h-5">
                                                Scheduled
                                            </Badge>
                                            <p className="text-xs text-muted-foreground font-medium">
                                                {format(event.date, "EEE, MMM d • h:mm a")}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" asChild className="rounded-xl hover:bg-primary/10 text-primary font-bold pr-4">
                                        <Link href={`/dashboard/projects/${event._id}`}>
                                            Details
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </Link>
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border/40 rounded-[32px] bg-muted/10">
                                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                <p className="font-medium">No upcoming scheduled posts.</p>
                                <Button variant="link" asChild className="mt-2 text-primary font-bold">
                                    <Link href="/dashboard/create">Schedule your first video</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border/40 shadow-sm rounded-[32px] bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="py-8 px-8">
                        <CardTitle className="text-xl font-bold font-outfit">Legend</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 px-8 pb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold">Published</p>
                                <p className="text-[11px] text-muted-foreground font-medium">Content is live on your social feeds.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold">Scheduled</p>
                                <p className="text-[11px] text-muted-foreground font-medium">Awaiting automated queue deployment.</p>
                            </div>
                        </div>
                        <div className="pt-6 mt-6 border-t border-border/40">
                            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                                <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
                                Smart timing is automatically applied to scheduled posts for maximum reach.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
