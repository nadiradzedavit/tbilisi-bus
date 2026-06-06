"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { useVehicles } from "@/lib/queries";
import { haversineKm, normalizeStopId } from "@/lib/geo";
import RouteBadge from "./RouteBadge";
import type { BusStop, Locale, Vehicle } from "@/lib/types";

const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center rounded-xl border border-border bg-bg-card/40 text-sm text-fg-dim">
      Loading map…
    </div>
  ),
});

const APPROACH_RADIUS_KM = 1.5;
const AVG_SPEED_KMH = 20;

function formatEta(km: number, locale: Locale): string {
  const min = Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60));
  return locale === "ka" ? `${min} წთ` : `${min} min`;
}

export default function StopMapClient({
  stop,
  locale,
}: {
  stop: BusStop;
  locale: Locale;
}) {
  const { data: vehicles } = useVehicles(locale);
  const stopIds = useMemo(() => new Set(normalizeStopId(stop.id)), [stop.id]);

  const approaching = useMemo(() => {
    const all = (vehicles ?? []) as Vehicle[];
    return all.filter((v) => {
      if (v.nextStopId && stopIds.has(v.nextStopId)) return true;
      return (
        Number.isFinite(v.lat) &&
        Number.isFinite(v.lon) &&
        haversineKm(v.lat, v.lon, stop.lat, stop.lon) < APPROACH_RADIUS_KM
      );
    });
  }, [vehicles, stopIds, stop.lat, stop.lon]);

  const highlightKeys = useMemo(
    () => new Set(approaching.map((v) => v.vehicleKey)),
    [approaching],
  );

  const enriched = useMemo(
    () =>
      approaching
        .map((v) => ({
          v,
          km: haversineKm(v.lat, v.lon, stop.lat, stop.lon),
        }))
        .sort((a, b) => a.km - b.km),
    [approaching, stop.lat, stop.lon],
  );

  const stopsForMap = useMemo(() => [stop], [stop]);

  return (
    <div className="space-y-4">
      <div className="h-80 w-full overflow-hidden rounded-xl border border-border">
        <LiveMap
          stops={stopsForMap}
          vehicles={approaching}
          center={[stop.lat, stop.lon]}
          zoom={14}
          className="h-full w-full"
          highlightKeys={highlightKeys}
        />
      </div>
      {enriched.length > 0 ? (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {enriched.map(({ v, km }) => (
            <li
              key={v.vehicleKey}
              className="flex items-center justify-between rounded-md border border-border bg-bg-card/40 px-3 py-2 text-sm"
            >
              <Link
                href={`/routes/${encodeURIComponent(v.busId)}`}
                className="ring-focus flex min-w-0 items-center gap-2 hover:text-fg"
              >
                <RouteBadge shortName={v.shortName} color={v.color} size="sm" />
                <span className="truncate text-fg">Bus {v.shortName}</span>
              </Link>
              <span className="tabular text-2xs text-fg-dim">
                ~{formatEta(km, locale)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-2xs text-fg-dim">
          {locale === "ka"
            ? "ამ გაჩერებაზე მოახლოებული ავტობუსი არ ჩანს"
            : "No buses approaching right now"}
        </p>
      )}
    </div>
  );
}
