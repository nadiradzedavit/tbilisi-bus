import type { Vehicle } from "./types";

export interface ClusteredVehicle extends Vehicle {
  count: number;
  isCluster: boolean;
}

export function clusterVehicles(
  vehicles: Vehicle[],
  zoom: number,
): ClusteredVehicle[] {
  if (zoom >= 14 || vehicles.length <= 1) {
    return vehicles.map((v) => ({ ...v, count: 1, isCluster: false }));
  }
  const cellSize = 360 / (2 ** zoom * 16);
  const buckets = new Map<string, Vehicle[]>();
  for (const v of vehicles) {
    const cx = Math.floor(v.lat / cellSize);
    const cy = Math.floor(v.lon / cellSize);
    const key = `${cx}:${cy}`;
    const arr = buckets.get(key);
    if (arr) arr.push(v);
    else buckets.set(key, [v]);
  }
  const out: ClusteredVehicle[] = [];
  for (const group of buckets.values()) {
    if (group.length === 1) {
      out.push({ ...group[0], count: 1, isCluster: false });
    } else {
      const rep = group[0];
      out.push({
        ...rep,
        lat: group.reduce((s, v) => s + v.lat, 0) / group.length,
        lon: group.reduce((s, v) => s + v.lon, 0) / group.length,
        count: group.length,
        isCluster: true,
      });
    }
  }
  return out;
}
