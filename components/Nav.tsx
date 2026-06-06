"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bus, Map, Route as RouteIcon, Search, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Live", icon: Bus },
  { href: "/stops", label: "Stops", icon: Search },
  { href: "/routes", label: "Routes", icon: RouteIcon },
  { href: "/plan", label: "Plan", icon: Map },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 ring-focus rounded-md"
            aria-label="Tbilisi Transport home"
          >
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-brand-bus to-status-live text-white shadow-glow-bus">
              <Bus className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="font-mono text-sm font-semibold tracking-tight text-fg">
              tbilisi<span className="text-brand-bus">.</span>transit
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {links.map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : pathname?.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "ring-focus flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-bg-card text-fg"
                      : "text-fg-muted hover:bg-bg-card/60 hover:text-fg",
                  )}
                >
                  <l.icon className="h-3.5 w-3.5" />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border/60 bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
        aria-label="Mobile"
      >
        {links.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "ring-focus flex min-h-[52px] min-w-[64px] flex-col items-center justify-center gap-0.5 text-2xs",
                active ? "text-brand-bus" : "text-fg-muted",
              )}
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
