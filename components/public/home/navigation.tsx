"use client"

import { IconHome, IconMessage, IconUser } from "@tabler/icons-react";
import { FloatingNav } from "@/components/ui/floating-navbar";

export default function Navigation() {
    const navItems = [
        {
            name: "How it works",
            link: "#how",
            icon: <IconHome className="h-4 w-4 text-muted-foreground" />,
        },
        {
            name: "Features",
            link: "#features",
            icon: <IconUser className="h-4 w-4 text-muted-foreground" />,
        },
        {
            name: "Showcase",
            link: "#showcase",
            icon: (
                <IconMessage className="h-4 w-4 text-muted-foreground" />
            ),
        },
    ];
    return (
        <div className="relative  w-full">
            <FloatingNav navItems={navItems} />
        </div>
    )
}