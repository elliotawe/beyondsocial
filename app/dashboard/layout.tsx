import {
    LayoutDashboard,
    Video,
    Calendar,
    BarChart3,
    Settings,
    ArrowLeft,
    Folder
} from "lucide-react";
import DashboardLayoutShell, { NavLink } from "@/components/dashboard/dashboard-layout-shell";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const links: NavLink[] = [
        {
            label: "Overview",
            href: "/dashboard",
            icon: (
                <LayoutDashboard className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Create Video",
            href: "/dashboard/create",
            icon: (
                <Video className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Projects",
            href: "/dashboard/projects",
            icon: (
                <Folder className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Calendar",
            href: "/dashboard/calendar",
            icon: (
                <Calendar className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Analytics",
            href: "/dashboard/analytics",
            icon: (
                <BarChart3 className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Settings",
            href: "/dashboard/settings",
            icon: (
                <Settings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Logout",
            href: "#",
            icon: (
                <ArrowLeft className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
    ];

    return (
        <DashboardLayoutShell links={links}>
            {children}
        </DashboardLayoutShell>
    );
}