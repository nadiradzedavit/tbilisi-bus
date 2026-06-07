import type { Bus, BusLocation } from "ttc-api/types";
import type { Vehicle } from "./types";

export function toVehicle(
  busId: string,
  index: number,
  loc: BusLocation,
  route: Pick<Bus, "id" | "shortName" | "color"> | null,
  direction: "forward" | "backward",
): Vehicle {
  const lat = Number(loc.lat);
  const lon = Number(loc.lon);
  const h = Number(loc.heading);
  return {
    vehicleKey: `${busId}:${direction}:${index}`,
    busId,
    shortName: route?.shortName ?? busId,
    color: route?.color ?? "0033B4",
    lat,
    lon,
    heading: Number.isFinite(h) ? h : null,
    nextStopId:
      typeof loc.nextStopId === "string" && loc.nextStopId.length > 0
        ? loc.nextStopId
        : null,
    updatedAt: Date.now(),
    direction,
  };
}
