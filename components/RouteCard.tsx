import Link from "next/link";
import RouteBadge from "./RouteBadge";
import type { Bus, Locale } from "@/lib/types";

export default function RouteCard({
  route,
  locale = "en",
}: {
  route: Bus;
  locale?: Locale;
}) {
  return (
    <Link
      href={`/routes/${encodeURIComponent(route.id)}`}
      className="ring-focus group flex items-center gap-3 rounded-lg border border-border bg-bg-card/40 p-3 transition-all glass-hover hover:border-brand-bus/40"
    >
      <RouteBadge shortName={route.shortName} color={route.color} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg group-hover:text-white">
          {route.longName}
        </p>
        <p className="text-2xs text-fg-dim">Bus route</p>
      </div>
    </Link>
  );
}
