import { NextRequest, NextResponse } from "next/server";
import { ttc, stopId } from "@/lib/ttc";
import { toVehicle } from "@/lib/vehicles";
import { parseLocale } from "@/lib/safe";
import type { Bus } from "ttc-api/types";
import type { BusLocation, Vehicle } from "@/lib/types";

const MAX_BUSES = 30;
const CONCURRENCY = 5;
const UPSTREAM_TIMEOUT_MS = 4000;

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

export async function GET(req: NextRequest) {
  const locale = parseLocale(req.nextUrl.searchParams.get("locale"));
  const busId = req.nextUrl.searchParams.get("busId");
  try {
    if (busId) {
      const normalizedBusId = stopId(busId);
      const locs = (await withTimeout(
        ttc.locations({ busId: normalizedBusId }),
        UPSTREAM_TIMEOUT_MS,
      )) as Array<BusLocation> | null;
      const allRoutes = (await withTimeout(
        ttc.routes({ locale }),
        UPSTREAM_TIMEOUT_MS,
      )) as Bus[] | null;
      const route =
        allRoutes?.find(
          (r) =>
            r.id === busId ||
            r.id === normalizedBusId ||
            r.id === `1:${normalizedBusId}`,
        ) ?? null;
      const vehicles: Vehicle[] = [];
      if (Array.isArray(locs)) {
        locs.forEach((loc, i) => {
          const lat = Number(loc.lat);
          const lon = Number(loc.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          vehicles.push(toVehicle(route?.id ?? busId, i, loc, route));
        });
      }
      return NextResponse.json(vehicles, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const allRoutes = (await withTimeout(
      ttc.routes({ locale }),
      UPSTREAM_TIMEOUT_MS,
    )) as Bus[] | null;
    if (!allRoutes) {
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }
    const targets = allRoutes.slice(0, MAX_BUSES);
    const settled = await runLimited(targets, CONCURRENCY, (r) =>
      withTimeout(ttc.locations({ busId: stopId(r.id) }), UPSTREAM_TIMEOUT_MS),
    );
    const vehicles: Vehicle[] = [];
    settled.forEach((res, i) => {
      if (!res || !Array.isArray(res)) return;
      const route = targets[i];
      res.forEach((loc, j) => {
        const lat = Number(loc.lat);
        const lon = Number(loc.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        vehicles.push(toVehicle(route.id, j, loc, route));
      });
    });
    return NextResponse.json(vehicles, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("vehicles aggregate failed", e);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
