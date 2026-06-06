"use client";

import { usePathname, useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export default function LanguageToggle() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const isKa = pathname.startsWith("/ka");
  const setLocale = (next: Locale) => {
    if (next === "ka" && !isKa) {
      router.push(`/ka${pathname === "/" ? "" : pathname}`);
    } else if (next === "en" && isKa) {
      router.push(pathname.replace(/^\/ka/, "") || "/");
    }
  };
  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center rounded-md border border-border bg-bg-card/60 p-0.5"
    >
      <button
        onClick={() => setLocale("en")}
        className={cn(
          "ring-focus flex items-center gap-1 rounded px-2 py-1 text-2xs font-semibold transition-colors",
          !isKa ? "bg-brand-bus text-white" : "text-fg-muted hover:text-fg",
        )}
        aria-pressed={!isKa}
      >
        <Languages className="h-3 w-3" /> EN
      </button>
      <button
        onClick={() => setLocale("ka")}
        className={cn(
          "ring-focus rounded px-2 py-1 text-2xs font-semibold transition-colors",
          isKa ? "bg-brand-bus text-white" : "text-fg-muted hover:text-fg",
        )}
        aria-pressed={isKa}
      >
        KA
      </button>
    </div>
  );
}
