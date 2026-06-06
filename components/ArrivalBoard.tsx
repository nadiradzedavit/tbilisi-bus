"use client";

import { useArrivals } from "@/lib/queries";
import LiveArrivalCard from "./LiveArrivalCard";
import { ArrivalSkeleton } from "./Skeleton";
import { AlertCircle, Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/types";

export default function ArrivalBoard({
  stopId,
  locale = "en",
}: {
  stopId: string;
  locale?: Locale;
}) {
  const { data, isLoading, error, dataUpdatedAt } = useArrivals(stopId, locale);
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const arrivals = (data as Array<{
    shortName: string;
    color: string;
    headsign: string;
    realtime: boolean;
    realtimeArrivalMinutes: number;
    scheduledArrivalMinutes: number;
  }> | undefined) ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-2xs uppercase tracking-wider text-fg-dim">
          Live arrivals
        </p>
        {dataUpdatedAt > 0 && (
          <p className="tabular text-2xs text-fg-dim">
            {timeAgo(dataUpdatedAt)}
          </p>
        )}
      </div>
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ArrivalSkeleton key={i} />
          ))}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Service unavailable</p>
            <p className="mt-1 text-xs text-destructive/80">
              Could not reach TTC API. Try again in a moment.
            </p>
          </div>
        </div>
      )}
      {!isLoading && !error && arrivals.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-fg-muted">No scheduled arrivals</p>
        </div>
      )}
      {!isLoading && !error && arrivals.length > 0 && (
        <ul className="space-y-2">
          {arrivals.map((a, i) => (
            <li key={`${a.shortName}-${a.headsign}-${a.realtimeArrivalMinutes}-${i}`}>
              <LiveArrivalCard arrival={a} locale={locale} index={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}
