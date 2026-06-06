import Link from "next/link";
import { MapPin } from "lucide-react";
import { modeColor, modeLabel } from "@/lib/utils";
import type { BusStop, Locale } from "@/lib/types";

export default function StopCard({
  stop,
  locale = "en",
}: {
  stop: BusStop;
  locale?: Locale;
}) {
  return (
    <Link
      href={`/stops/${encodeURIComponent(stop.id)}`}
      className="ring-focus group flex items-center gap-3 rounded-lg border border-border bg-bg-card/40 p-3 transition-all glass-hover hover:border-brand-bus/40"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
        style={{
          background: `${modeColor(stop.vehicleMode)}22`,
          color: modeColor(stop.vehicleMode),
          border: `1px solid ${modeColor(stop.vehicleMode)}55`,
        }}
      >
        <MapPin className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg group-hover:text-white">
          {stop.name}
        </p>
        <p className="text-2xs text-fg-dim">
          {stop.code && <span className="tabular">{stop.code}</span>}
          {stop.code && " · "}
          {modeLabel(stop.vehicleMode, locale)}
        </p>
      </div>
    </Link>
  );
}
