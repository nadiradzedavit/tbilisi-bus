"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useStops, useVehicles } from "@/lib/queries";
import type { BusStop, Locale } from "@/lib/types";

const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-bg-card/30 text-2xs text-fg-dim">
      Loading map…
    </div>
  ),
});

export default function CityLiveMap({ locale = "en" }: { locale?: Locale }) {
  const { data: stops } = useStops(locale);
  const { data: vehicles } = useVehicles(locale);
  const stopList = useMemo(
    () => ((stops as BusStop[] | undefined) ?? []).filter(
      (s) => Number.isFinite(s.lat) && Number.isFinite(s.lon),
    ),
    [stops],
  );
  const vehicleList = useMemo(
    () =>
      (vehicles ?? []).filter(
        (v) => Number.isFinite(v.lat) && Number.isFinite(v.lon),
      ),
    [vehicles],
  );
  return (
    <div className="relative h-[60vh] w-full overflow-hidden rounded-xl border border-border">
      <LiveMap
        stops={stopList}
        vehicles={vehicleList}
        center={[41.7151, 44.8271]}
        zoom={12}
        className="h-full w-full"
      />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-md border border-border bg-bg-card/80 px-2 py-1 text-2xs font-semibold text-fg backdrop-blur">
        <span
          className={`h-1.5 w-1.5 rounded-full ${vehicleList.length ? "animate-pulse-live bg-status-live" : "bg-fg-dim"}`}
        />
        {vehicleList.length
          ? `${vehicleList.length} live`
          : locale === "ka"
            ? "ცოცხალი მანქანები არ არის"
            : "No live vehicles"}
      </div>
    </div>
  );
}
