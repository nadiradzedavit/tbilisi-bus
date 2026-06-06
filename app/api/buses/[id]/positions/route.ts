import { NextResponse } from "next/server";
import { ttc, stopId } from "@/lib/ttc";
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
    const data = (await withTimeout(
      ttc.locations({ busId }),
      UPSTREAM_TIMEOUT_MS,
    )) as Array<{
      lat: number;
      lon: number;
      heading: number;
      nextStopId?: string;
    }> | null;
    const vehicles: Vehicle[] = [];
    if (Array.isArray(data)) {
      data.forEach((loc, i) => {
        const lat = Number(loc.lat);
        const lon = Number(loc.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        vehicles.push(toVehicle(busId, i, loc, null));
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
