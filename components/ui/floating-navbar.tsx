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
        "flex max-w-[95vw] md:max-w-fit fixed top-4 sm:top-10 inset-x-0 mx-auto border border-border rounded-full bg-background/95 backdrop-blur-sm shadow-lg z-5000 pr-2 pl-4 sm:pl-8 py-2 items-center justify-center space-x-4 sm:space-x-8 md:space-x-12",
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