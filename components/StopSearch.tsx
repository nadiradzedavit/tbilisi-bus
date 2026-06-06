"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, MapPin } from "lucide-react";
import { useStops } from "@/lib/queries";
import { Skeleton } from "./Skeleton";
import { modeColor, modeLabel } from "@/lib/utils";
import type { BusStop, Locale } from "@/lib/types";

export default function StopSearch({ locale = "en" }: { locale?: Locale }) {
  const { data, isLoading } = useStops(locale);
  const stops = (data as BusStop[] | undefined) ?? [];
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return stops.slice(0, 20);
    return stops
      .filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          (s.code ?? "").toLowerCase().includes(term),
      )
      .slice(0, 30);
  }, [q, stops]);

  return (
    <div className="rounded-xl border border-border bg-bg-card/40 p-3 backdrop-blur">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-dim" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            locale === "ka" ? "გაჩერების ძებნა..." : "Search stops by name or code..."
          }
          className="ring-focus w-full rounded-md border border-border bg-bg/60 py-2.5 pl-10 pr-3 text-sm text-fg placeholder:text-fg-dim"
          aria-label="Search stops"
        />
      </div>
      <div className="mt-3 max-h-80 overflow-y-auto pr-1">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}
        {!isLoading && results.length === 0 && (
          <p className="py-6 text-center text-sm text-fg-dim">
            {locale === "ka" ? "ვერ მოიძებნა" : "No stops match"}
          </p>
        )}
        {!isLoading && results.length > 0 && (
          <ul className="space-y-1">
            {results.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/stops/${encodeURIComponent(s.id)}`}
                  className="ring-focus flex items-center gap-3 rounded-md border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-bg-card/60"
                >
                  <span
                    className="grid h-8 w-8 place-items-center rounded-md"
                    style={{
                      background: `${modeColor(s.vehicleMode)}22`,
                      color: modeColor(s.vehicleMode),
                    }}
                  >
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-fg">{s.name}</p>
                    <p className="text-2xs text-fg-dim">
                      {s.code && <span className="tabular">{s.code} · </span>}
                      {modeLabel(s.vehicleMode, locale)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
