"use client";
import { JSX } from "react";
import { cn } from "@/lib/utils";
import Logo from "@/components/partials/logo";
import Link from "next/link";


export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string;
    link: string;
    icon?: JSX.Element;
  }[];
  className?: string;
}) => {

  return (
    <div
      className={cn(
        "flex max-w-[95vw] md:max-w-fit fixed top-6 inset-x-0 mx-auto border border-white/10 rounded-full bg-background/60 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] z-50 px-4 sm:px-6 py-3 items-center justify-center gap-4 sm:gap-8 md:gap-10 transition-all duration-300",
        className
      )}
    >
      <Logo className="h-8 sm:h-10 md:h-12 w-auto" />
      {navItems.map((navItem, idx: number) => (
        <a
          key={`link=${idx}`}
          href={navItem.link}
          className={cn(
            "relative items-center flex space-x-1 text-muted-foreground hover:text-primary transition-colors"
          )}
        >
          <span className="block sm:hidden">{navItem.icon}</span>
          <span className="hidden sm:block text-sm font-medium">{navItem.name}</span>
        </a>
      ))}
      <div>
        <Link href="/login" className="border text-xs sm:text-sm font-medium relative border-border text-foreground px-3 sm:px-4 py-1.5 sm:py-2 rounded-full whitespace-nowrap hover:bg-muted transition-colors">
          <span>Get Started</span>
          <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px bg-linear-to-r from-transparent via-primary to-transparent h-px" />
        </Link>
      </div>
    </div>
  );
};