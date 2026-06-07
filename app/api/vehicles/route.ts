import { NextRequest, NextResponse } from "next/server";
import { fetchAllLocations, stopId, ttc } from "@/lib/ttc";
import { toVehicle } from "@/lib/vehicles";
import { fetchAllVehicles } from "@/lib/fetchVehicles";
import { parseLocale } from "@/lib/safe";
import type { Bus } from "ttc-api/types";
import type { Vehicle } from "@/lib/types";

const UPSTREAM_TIMEOUT_MS = 3000;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

export async function GET(req: NextRequest) {
  const locale = parseLocale(req.nextUrl.searchParams.get("locale"));
  const busId = req.nextUrl.searchParams.get("busId");
  try {
    if (busId) {
      const normalizedBusId = stopId(busId);
      const tagged = await withTimeout(
        fetchAllLocations({ busId: normalizedBusId }),
        UPSTREAM_TIMEOUT_MS,
      );
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
      if (Array.isArray(tagged)) {
        const counts = new Map<"forward" | "backward", number>();
        tagged.forEach(({ loc, direction }) => {
          const lat = Number(loc.lat);
          const lon = Number(loc.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          const i = counts.get(direction) ?? 0;
          counts.set(direction, i + 1);
          vehicles.push(toVehicle(route?.id ?? busId, i, loc, route, direction));
        });
      }
      return NextResponse.json(vehicles, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const vehicles = await fetchAllVehicles(locale);
    return NextResponse.json(vehicles, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("vehicles aggregate failed", e);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
