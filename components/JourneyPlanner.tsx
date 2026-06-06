"use client";

import { useState } from "react";
import { ArrowRight, Loader2, MapPin, Navigation2 } from "lucide-react";
import { usePlan, useStops } from "@/lib/queries";
import RouteBadge from "./RouteBadge";
import { cn, formatMinutes } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export default function JourneyPlanner({ locale = "en" }: { locale?: Locale }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: stops } = useStops(locale);
  const plan = usePlan();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const norm = (v: string) => v.trim().toLowerCase();
    const list = (stops as Array<{ name: string; lat: number; lon: number }> | undefined) ?? [];
    const f = list.find((s) => norm(s.name) === norm(from));
    const t = list.find((s) => norm(s.name) === norm(to));
    if (!f || !t) return;
    plan.mutate({ from: [f.lat, f.lon], to: [t.lat, t.lon], locale });
  };

  const itineraries = (plan.data as {
    itineraries?: Array<{
      duration: number;
      walkTime: number;
      legs: Array<{
        mode: string;
        route?: { shortName: string; color: string };
        from: { name: string };
        to: { name: string };
        duration: number;
        headsign?: string;
      }>;
    }>;
  } | undefined)?.itineraries;

  const hasNoResults =
    Boolean(plan.data) &&
    !itineraries?.length &&
    !plan.isPending;

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-xl border border-border bg-bg-card/40 p-4 backdrop-blur sm:grid-cols-[1fr_auto_1fr_auto]"
      >
        <div>
          <label htmlFor="jp-from" className="mb-1 flex items-center gap-1.5 text-2xs uppercase tracking-wider text-fg-dim">
            <Navigation2 className="h-3 w-3" /> From
          </label>
          <input
            id="jp-from"
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Stop name..."
            list="stop-list"
            className="ring-focus w-full rounded-md border border-border bg-bg/60 px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="hidden items-end justify-center pb-2 sm:flex">
          <ArrowRight className="h-4 w-4 text-fg-dim" />
        </div>
        <div>
          <label htmlFor="jp-to" className="mb-1 flex items-center gap-1.5 text-2xs uppercase tracking-wider text-fg-dim">
            <MapPin className="h-3 w-3" /> To
          </label>
          <input
            id="jp-to"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Stop name..."
            list="stop-list"
            className="ring-focus w-full rounded-md border border-border bg-bg/60 px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={plan.isPending}
            className="ring-focus inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-bus px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {plan.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Searching
              </>
            ) : (
              <>Find route</>
            )}
          </button>
        </div>
        <datalist id="stop-list">
          {((stops as Array<{ id: string; name: string }> | undefined) ?? []).map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
      </form>

      {plan.isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not plan journey. Try different stops.
        </div>
      )}

      {itineraries && itineraries.length > 0 && (
        <div className="space-y-3">
          {itineraries.slice(0, 3).map((it, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl border bg-bg-card/50 p-4",
                i === 0
                  ? "border-status-live/40 shadow-glow-live"
                  : "border-border",
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-2xs uppercase tracking-wider text-fg-dim">
                  Option {i + 1}
                </p>
                <p className="tabular text-sm font-semibold text-fg">
                  {formatMinutes(Math.round(it.duration / 60), locale)}
                </p>
              </div>
              <div className="space-y-2">
                {it.legs.map((leg, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-2 rounded-md border border-border/60 bg-bg/40 p-2"
                  >
                    {leg.route ? (
                      <RouteBadge
                        shortName={leg.route.shortName}
                        color={leg.route.color}
                        size="sm"
                      />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-md bg-fg-dim/20 text-fg-muted">
                        <Navigation2 className="h-3 w-3" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-fg">
                        {leg.from.name} → {leg.to.name}
                      </p>
                      <p className="text-2xs text-fg-dim tabular">
                        {formatMinutes(Math.round(leg.duration / 60), locale)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasNoResults && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-fg-muted">
          No routes found. Try different stops.
        </p>
      )}
    </div>
  );
}
