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

export function normalizeStopId(id: string): string[] {
  const out = new Set<string>([id]);
  if (id.startsWith("1:")) out.add(id.slice(2));
  else out.add(`1:${id}`);
  const tail = id.split(":").pop();
  if (tail) out.add(tail);
  return Array.from(out);
}
