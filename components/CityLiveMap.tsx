"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useStops, useVehicleStream } from "@/lib/queries";
import type { BusStop, Locale, StyleMode } from "@/lib/types";
import MapStyleToggle from "./MapStyleToggle";

const STYLE_KEY = "map-style-mode";

const LiveMap = dynamic(() => import("./DarkMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-bg-card/30 text-2xs text-fg-dim">
      Loading map…
    </div>
  ),
});

export default function CityLiveMap({ locale = "en" }: { locale?: Locale }) {
  const { data: stops } = useStops(locale);
  const { vehicles, isConnected } = useVehicleStream(locale);
  const [styleMode, setStyleMode] = useState<StyleMode>("dark");

  useEffect(() => {
    const v = window.localStorage.getItem(STYLE_KEY);
    if (v === "dark" || v === "satellite") setStyleMode(v);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STYLE_KEY, styleMode);
  }, [styleMode]);

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
        styleMode={styleMode}
      />
      <MapStyleToggle value={styleMode} onChange={setStyleMode} />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-md border border-border bg-bg-card/80 px-2 py-1 text-2xs font-semibold text-fg backdrop-blur">
        <span
          className={`h-1.5 w-1.5 rounded-full ${vehicleList.length ? (isConnected ? "animate-pulse-live bg-status-live" : "animate-pulse-live bg-amber-500") : "bg-fg-dim"}`}
        />
        {vehicleList.length
          ? `${vehicleList.length} live${!isConnected ? " (polling)" : ""}`
          : locale === "ka"
            ? "ცოცხალი მანქანები არ არის"
            : "No live vehicles"}
      </div>
    </div>
  );
}
