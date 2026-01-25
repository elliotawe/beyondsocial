import {
    LayoutDashboard,
    Users,
    Settings,
    Headset,
    ShieldCheck,
    ArrowLeft,
    BarChart3
} from "lucide-react";
import DashboardLayoutShell, { NavLink } from "@/components/dashboard/dashboard-layout-shell";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const links: NavLink[] = [
        {
            label: "Platform Overview",
            href: "/admin",
            icon: (
                <LayoutDashboard className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "User Management",
            href: "/admin/users",
            icon: (
                <Users className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "System Analytics",
            href: "/admin/analytics",
            icon: (
                <BarChart3 className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Tech Settings",
            href: "/admin/tech-settings",
            icon: (
                <ShieldCheck className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Customer Support",
            href: "/admin/support",
            icon: (
                <Headset className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
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
        <DashboardLayoutShell links={links} requiredRole="admin">
            {children}
        </DashboardLayoutShell>
    );
}
