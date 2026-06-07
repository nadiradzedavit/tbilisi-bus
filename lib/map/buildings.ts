import type { Feature, FeatureCollection, Polygon } from "geojson";

const STORAGE_KEY = "tb:buildings:v1";
const EMPTY_KEY = "tb:buildings:empty:v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY_TTL_MS = 5 * 60 * 1000;
const HOST_TIMEOUT_MS = 6000;
const BBOX = { south: 41.62, west: 44.66, north: 41.82, east: 44.95 } as const;

const OVERPASS_HOSTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;

type Cached = { ts: number; data: FeatureCollection };

function readCache(): FeatureCollection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.ts !== "number" ||
      Date.now() - parsed.ts > TTL_MS ||
      !parsed.data ||
      typeof parsed.data !== "object" ||
      parsed.data.type !== "FeatureCollection" ||
      !Array.isArray(parsed.data.features)
    ) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(fc: FeatureCollection): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Cached = { ts: Date.now(), data: fc };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be full or disabled — silently skip
  }
}

function readEmptyThrottle(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(EMPTY_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < EMPTY_TTL_MS;
  } catch {
    return false;
  }
}

function writeEmptyThrottle(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EMPTY_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function buildQuery(): string {
  return (
    `[out:json][timeout:25];` +
    `(` +
    `way["building"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});` +
    `);` +
    `out geom;`
  );
}

function normalize(
  raw: { elements?: Array<Record<string, unknown>> },
): FeatureCollection {
  const features: Feature<Polygon>[] = [];
  for (const el of raw.elements ?? []) {
    if (el.type !== "way") continue;
    const geom = el.geometry as Array<{ lat: number; lon: number }> | undefined;
    if (!geom || geom.length < 4) continue;
    const ring = geom.map((p) => [p.lon, p.lat] as [number, number]);
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push(ring[0]);
    }
    const heightHint = Number(el["height"] ?? 0) || 0;
    const levels = Number(el["building:levels"] ?? 0) || 0;
    const height = heightHint || (levels ? levels * 3 : 10 + Math.random() * 15);
    features.push({
      type: "Feature",
      properties: { id: String(el.id), height },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }
  return { type: "FeatureCollection", features };
}

let inflight: Promise<FeatureCollection | null> | null = null;

export function fetchTbilisiBuildings(): Promise<FeatureCollection | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const cached = readCache();
  if (cached) return Promise.resolve(cached);
  if (readEmptyThrottle()) return Promise.resolve(null);

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      for (const host of OVERPASS_HOSTS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), HOST_TIMEOUT_MS);
        try {
          const res = await fetch(host, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `data=${encodeURIComponent(buildQuery())}`,
            signal: controller.signal,
          });
          if (!res.ok) continue;
          const json = (await res.json()) as { elements?: Array<Record<string, unknown>> };
          const fc = normalize(json);
          if (fc.features.length > 0) {
            writeCache(fc);
          } else {
            writeEmptyThrottle();
          }
          return fc;
        } catch {
          // try next host
        } finally {
          clearTimeout(timer);
        }
      }
      writeEmptyThrottle();
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
