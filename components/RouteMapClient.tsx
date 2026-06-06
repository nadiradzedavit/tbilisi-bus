"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useVehicles } from "@/lib/queries";
import type { Bus, BusStop, Locale, RoutePolylines, RouteStop, Vehicle } from "@/lib/types";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center rounded-xl border border-border bg-bg-card/40 text-sm text-fg-dim">
      Loading map…
    </div>
  ),
});

export default function RouteMapClient({
  stops,
  center,
  zoom,
  route,
  polyline,
  polylines,
  locale = "en",
}: {
  stops: (BusStop | RouteStop)[];
  center: [number, number];
  zoom: number;
  route: Pick<Bus, "id" | "shortName" | "color">;
  polyline?: Array<[number, number]>;
  polylines?: RoutePolylines;
  locale?: Locale;
}) {
  const { data: vehicles } = useVehicles(locale, route.id);
  const vehicleList = useMemo(
    () =>
      (vehicles ?? [])
        .filter((v) => v.busId === route.id)
        .filter((v: Vehicle) => Number.isFinite(v.lat) && Number.isFinite(v.lon)),
    [vehicles, route.id],
  );

  const hasMulti =
    Boolean(polylines && (polylines.forward.length > 1 || polylines.backward.length > 1));
  const hasLegacy = Boolean(polyline && polyline.length > 1);

  return (
    <LiveMap
      stops={stops}
      vehicles={vehicleList}
      polyline={hasMulti ? undefined : polyline}
      polylines={hasMulti ? polylines : undefined}
      center={center}
      zoom={zoom}
      fitPolyline={hasMulti || hasLegacy}
      className="h-full"
    />
  );
}
