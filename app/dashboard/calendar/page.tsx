import { auth } from "@/auth";
import { getCalendarEvents } from "@/app/actions/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Calendar as CalendarIcon,
    Play
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
    addMonths,
    subMonths
} from "date-fns";

export default async function ContentCalendarPage() {
    const session = await auth();
    const events = await getCalendarEvents();

    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 font-outfit">Content Calendar</h1>
                    <p className="text-muted-foreground">Plan and track your social media presence.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/projects">View All Projects</Link>
                    </Button>
                    <Button asChild size="sm">
                        <Link href="/dashboard/create">
                            <Plus className="w-4 h-4 mr-2" />
                            Create New
                        </Link>
                    </Button>
                </div>
            </div>

            <Card className="border-border shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold font-outfit">
                            {format(today, "MMMM yyyy")}
                        </h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" disabled>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-7 border-b bg-muted/10">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="py-2 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, idx) => {
                            const dayEvents = events.filter((e: any) => isSameDay(new Date(e.date), day));
                            const isToday = isSameDay(day, today);
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <div
                                    key={idx}
                                    className={`min-h-[120px] p-2 border-r border-b last:border-r-0 transition-colors ${!isCurrentMonth ? "bg-muted/5 opacity-40" : ""
                                        } ${isToday ? "bg-primary/5" : ""}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                            }`}>
                                            {format(day, "d")}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {dayEvents.map((event: any) => (
                                            <Link
                                                key={event._id}
                                                href={`/dashboard/projects/${event._id}`}
                                                className="block p-1 bg-background border border-border rounded shadow-sm text-[10px] truncate hover:border-primary transition-colors group"
                                            >
                                                <div className="flex items-center gap-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${event.status === "posted" ? "bg-emerald-500" : "bg-blue-500"
                                                        }`} />
                                                    <span className="truncate group-hover:text-primary">{event.title}</span>
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

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2 border-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Upcoming Schedule</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {events.filter((e: any) => new Date(e.date) >= today && e.status === "scheduled").length > 0 ? (
                            events
                                .filter((e: any) => new Date(e.date) >= today && e.status === "scheduled")
                                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                .map((event: any) => (
                                    <div key={event._id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                            {event.thumbnail ? (
                                                <img src={event.thumbnail} className="w-full h-full object-cover" />
                                            ) : (
                                                <Play className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold">{event.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(event.date), "EEE, MMM d 'at' h:mm a")}
                                            </p>
                                        </div>
                                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                            Scheduled
                                        </Badge>
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/projects/${event._id}`}>Details</Link>
                                        </Button>
                                    </div>
                                ))
                        ) : (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p>No projects scheduled for the future.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Calendar Legend</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <div className="text-sm">
                                <p className="font-medium">Published</p>
                                <p className="text-xs text-muted-foreground">Content is live on socials.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <div className="text-sm">
                                <p className="font-medium">Scheduled</p>
                                <p className="text-xs text-muted-foreground">Awaiting auto-publish.</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t">
                            <p className="text-xs text-muted-foreground italic">
                                "Smart timing is automatically applied to your scheduled posts for maximum reach."
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
