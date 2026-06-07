import { NextResponse } from "next/server";
import { fetchAllLocations, stopId } from "@/lib/ttc";
import { toVehicle } from "@/lib/vehicles";
import type { Vehicle } from "@/lib/types";

const UPSTREAM_TIMEOUT_MS = 4000;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const busId = stopId(id);
  try {
    const tagged = await withTimeout(
      fetchAllLocations({ busId }),
      UPSTREAM_TIMEOUT_MS,
    );
    const vehicles: Vehicle[] = [];
    if (Array.isArray(tagged)) {
      const counts = new Map<"forward" | "backward", number>();
      tagged.forEach(({ loc, direction }) => {
        const lat = Number(loc.lat);
        const lon = Number(loc.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        const i = counts.get(direction) ?? 0;
        counts.set(direction, i + 1);
        vehicles.push(toVehicle(busId, i, loc, null, direction));
      });
    }
    return NextResponse.json(vehicles, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("positions failed", e);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
