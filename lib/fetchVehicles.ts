import { fetchAllLocations, stopId, ttc } from "@/lib/ttc";
import { toVehicle } from "@/lib/vehicles";
import type { Bus, Locale } from "ttc-api/types";
import type { Vehicle } from "@/lib/types";

const MAX_BUSES = 30;
const CONCURRENCY = 5;
const UPSTREAM_TIMEOUT_MS = 3000;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

async function runLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<Array<R | null>> {
  const out: Array<R | null> = new Array(items.length).fill(null);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]).catch((e) => {
        console.error("vehicle fetch failed", e);
        return null;
      });
    }
  });
  await Promise.all(workers);
  return out;
}

export async function fetchAllVehicles(locale: Locale = "en"): Promise<Vehicle[]> {
  const allRoutes = (await withTimeout(
    ttc.routes({ locale }),
    UPSTREAM_TIMEOUT_MS,
  )) as Bus[] | null;
  if (!allRoutes) throw new Error("Failed to fetch routes");

  const targets = allRoutes.slice(0, MAX_BUSES);
  const settled = await runLimited(targets, CONCURRENCY, (r) =>
    withTimeout(fetchAllLocations({ busId: stopId(r.id) }), UPSTREAM_TIMEOUT_MS),
  );

  const vehicles: Vehicle[] = [];
  settled.forEach((tagged, i) => {
    if (!tagged || !Array.isArray(tagged)) return;
    const route = targets[i];
    const counts = new Map<"forward" | "backward", number>();
    tagged.forEach(({ loc, direction }) => {
      const lat = Number(loc.lat);
      const lon = Number(loc.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const j = counts.get(direction) ?? 0;
      counts.set(direction, j + 1);
      vehicles.push(toVehicle(route.id, j, loc, route, direction));
    });
  });
  return vehicles;
}
