const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function pointToPolylineKm(
  point: [number, number],
  polyline: Array<[number, number]>,
): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) {
    return haversineKm(point[0], point[1], polyline[0][0], polyline[0][1]);
  }
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentKm(point, polyline[i], polyline[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

function pointToSegmentKm(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const cosLat = Math.cos((p[0] * Math.PI) / 180);
  const ax = a[1] * cosLat, ay = a[0];
  const bx = b[1] * cosLat, by = b[0];
  const px = p[1] * cosLat, py = p[0];
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return haversineKm(py, px, ay / cosLat, ax);
  const tRaw = ((px - ax) * dx + (py - ay) * dy) / len2;
  const t = tRaw < 0 ? 0 : tRaw > 1 ? 1 : tRaw;
  const cx = (ax + t * dx) / cosLat, cy = ay + t * dy;
  return haversineKm(py, px, cy, cx);
}

export function nearestPolylineDirection(
  point: [number, number],
  forward: Array<[number, number]>,
  backward: Array<[number, number]>,
  thresholdKm = 5,
): "forward" | "backward" | null {
  const df = pointToPolylineKm(point, forward);
  const db = pointToPolylineKm(point, backward);
  if (df === Infinity && db === Infinity) return null;
  if (df <= thresholdKm && db <= thresholdKm) return df <= db ? "forward" : "backward";
  if (df <= thresholdKm) return "forward";
  if (db <= thresholdKm) return "backward";
  return df <= db ? "forward" : "backward";
}

export function bearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function polylineTangentAtPoint(
  point: [number, number],
  polyline: Array<[number, number]>,
): { bearing: number; distKm: number } | null {
  if (polyline.length < 2) return null;
  let minDist = Infinity;
  let bestIdx = -1;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentKm(point, polyline[i], polyline[i + 1]);
    if (d < minDist) {
      minDist = d;
      bestIdx = i;
    }
  }
  if (bestIdx < 0) return null;
  const a = polyline[bestIdx];
  const b = polyline[bestIdx + 1];
  if (a[0] === b[0] && a[1] === b[1]) return null;
  return {
    bearing: bearingDeg(a[0], a[1], b[0], b[1]),
    distKm: minDist,
  };
}

export function inferDirectionByHeading(
  point: [number, number],
  headingDeg: number | null,
  forward: Array<[number, number]>,
  backward: Array<[number, number]>,
  toleranceDeg = 60,
): "forward" | "backward" | null {
  if (headingDeg == null || headingDeg === 0) return null;
  const f = polylineTangentAtPoint(point, forward);
  const b = polylineTangentAtPoint(point, backward);
  if (!f && !b) return null;
  const diff = (h: number, t: number) => Math.abs(((h - t + 540) % 360) - 180);
  const fScore = f ? diff(headingDeg, f.bearing) : Infinity;
  const bScore = b ? diff(headingDeg, b.bearing) : Infinity;
  if (fScore < toleranceDeg && fScore < bScore) return "forward";
  if (bScore < toleranceDeg && bScore < fScore) return "backward";
  return null;
}

export function normalizeStopId(id: string): string[] {
  const out = new Set<string>([id]);
  if (id.startsWith("1:")) out.add(id.slice(2));
  else out.add(`1:${id}`);
  const tail = id.split(":").pop();
  if (tail) out.add(tail);
  return Array.from(out);
}
