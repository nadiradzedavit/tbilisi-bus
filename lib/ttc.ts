import "server-only";
import { ttc } from "ttc-api";
import type { BusStop, BusLocation, Locale } from "ttc-api/types";

export { ttc };

/**
 * Normalizes a stop or bus ID by removing any existing "1:" prefix.
 * This ensures that the ID passed to the ttc-api is always the raw numeric ID,
 * as the library handles its own prefixing internally.
 */
export function stopId(raw: string): string {
  return raw.startsWith("1:") ? raw.slice(2) : raw;
}

export async function safeStop(id: string): Promise<BusStop | null> {
  try {
    const r = await ttc.stop(id);
    if (r && typeof r === "object" && "lat" in r && "lon" in r) {
      return r as BusStop;
    }
    return null;
  } catch {
    return null;
  }
}

export async function safeBusRoutes({
  busId,
  locale = "en",
  forward,
}: {
  busId: string;
  locale?: Locale;
  forward?: boolean;
}): Promise<BusStop[]> {
  try {
    const res = await ttc.busRoutes({ busId, locale, forward });
    if (Array.isArray(res)) return res as BusStop[];
    return [];
  } catch {
    return [];
  }
}

export async function fetchAllLocations({
  busId,
}: {
  busId: string;
}): Promise<Array<{ loc: BusLocation; direction: "forward" | "backward" }>> {
  const fetchOne = async (
    direction: "forward" | "backward",
  ): Promise<Array<{ loc: BusLocation; direction: "forward" | "backward" }>> => {
    try {
      const res = (await ttc.locations({ busId, forward: direction === "forward" })) as unknown;
      if (!Array.isArray(res)) return [];
      const valid = res.filter(
        (x): x is BusLocation =>
          x !== null &&
          typeof x === "object" &&
          "lat" in x &&
          "lon" in x &&
          Number.isFinite(Number((x as BusLocation).lat)) &&
          Number.isFinite(Number((x as BusLocation).lon)),
      );
      return valid.map((loc) => ({ loc, direction }));
    } catch {
      return [];
    }
  };
  const [fwd, bwd] = await Promise.all([fetchOne("forward"), fetchOne("backward")]);
  return [...fwd, ...bwd];
}

export async function safeStops({
  locale = "en",
}: {
  locale?: Locale;
}): Promise<BusStop[]> {
  try {
    const res = (await ttc.stops({ locale })) as unknown;
    if (Array.isArray(res)) return res as BusStop[];
    return [];
  } catch {
    return [];
  }
}
