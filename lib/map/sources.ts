import type { Map as MLMap, GeoJSONSource, ExpressionSpecification } from "maplibre-gl";
import type {
  BusStop,
  DirectionFilter,
  RoutePolylines,
  Vehicle,
} from "@/lib/types";
import { sanitizeColor } from "@/lib/safe";

function normColor(c: string | undefined | null): string {
  const bare = sanitizeColor(c);
  return bare.startsWith("#") ? bare : `#${bare}`;
}

function vehicleKeyExpr(): ExpressionSpecification {
  return ["coalesce", ["get", "vehicleKey"], ""];
}

function vehiclesFC(vehicles: Vehicle[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: vehicles
      .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lon))
      .map((v) => ({
        type: "Feature",
        id: v.vehicleKey,
        geometry: { type: "Point", coordinates: [v.lon, v.lat] },
        properties: {
          vehicleKey: v.vehicleKey,
          busId: v.busId,
          shortName: v.shortName,
          color: normColor(v.color),
          heading: v.heading ?? 0,
          nextStopId: v.nextStopId ?? "",
        },
      })),
  };
}

function stopsFC(stops: BusStop[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stops
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
      .map((s) => ({
        type: "Feature",
        id: s.id,
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
        properties: {
          id: s.id,
          name: s.name,
          code: s.code ?? "",
          mode: s.vehicleMode,
        },
      })),
  };
}

function lineStringFromTuples(
  tuples: Array<[number, number]>,
  color: string,
  dashed: boolean,
): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates: tuples.map(([la, lo]) => [lo, la]) },
    properties: { color, dashed },
  };
}

function routeFC(
  polylines: RoutePolylines,
  color: string,
  filter: DirectionFilter = "both",
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  if (filter !== "backward" && polylines.forward.length > 1) {
    features.push(lineStringFromTuples(polylines.forward, color, false));
  }
  if (filter !== "forward" && polylines.backward.length > 1) {
    features.push(lineStringFromTuples(polylines.backward, color, true));
  }
  return { type: "FeatureCollection", features };
}

function polylineFC(
  polyline: Array<[number, number]>,
  color: string,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [lineStringFromTuples(polyline, color, false)],
  };
}

function setOrAddSource(
  map: MLMap,
  id: string,
  data: GeoJSON.FeatureCollection,
): void {
  const existing = map.getSource(id) as GeoJSONSource | undefined;
  if (existing && "setData" in existing) {
    existing.setData(data);
  } else {
    map.addSource(id, { type: "geojson", data });
  }
}

function highlightLiteral(highlight?: Set<string>): string[] | null {
  if (!highlight || highlight.size === 0) return null;
  return Array.from(highlight);
}

export function updateVehicles(
  map: MLMap,
  vehicles: Vehicle[],
  highlight?: Set<string>,
): void {
  setOrAddSource(map, "vehicles", vehiclesFC(vehicles));
  if (!map.getLayer("bus-glow")) return;
  const hi = highlightLiteral(highlight);
  if (hi && hi.length > 0) {
    map.setPaintProperty("bus-glow", "circle-opacity", [
      "case",
      ["in", vehicleKeyExpr(), ["literal", hi]],
      0.45,
      0.12,
    ]);
    map.setPaintProperty("bus-core", "circle-opacity", [
      "case",
      ["in", vehicleKeyExpr(), ["literal", hi]],
      1,
      0.35,
    ]);
    map.setPaintProperty("bus-core", "circle-radius", [
      "interpolate",
      ["linear"],
      ["zoom"],
      10,
      ["case", ["in", vehicleKeyExpr(), ["literal", hi]], 5, 3],
      16,
      ["case", ["in", vehicleKeyExpr(), ["literal", hi]], 9, 6],
    ]);
  } else {
    map.setPaintProperty("bus-glow", "circle-opacity", 0.35);
    map.setPaintProperty("bus-core", "circle-opacity", 1);
    map.setPaintProperty("bus-core", "circle-radius", [
      "interpolate",
      ["linear"],
      ["zoom"],
      10,
      3,
      16,
      6,
    ]);
  }
}

export function updateStops(map: MLMap, stops: BusStop[]): void {
  setOrAddSource(map, "stops", stopsFC(stops));
}

export function updateRoutes(
  map: MLMap,
  polylines: RoutePolylines | undefined,
  polyline: Array<[number, number]> | undefined,
  color: string,
  directionFilter: DirectionFilter = "both",
): void {
  if (polylines) {
    setOrAddSource(map, "routes", routeFC(polylines, color, directionFilter));
  } else if (polyline && polyline.length > 1) {
    setOrAddSource(map, "routes", polylineFC(polyline, color));
  } else {
    const existing = map.getSource("routes") as GeoJSONSource | undefined;
    if (existing) {
      existing.setData({ type: "FeatureCollection", features: [] });
    }
  }
}

export function updateBuildings(
  map: MLMap,
  fc: GeoJSON.FeatureCollection | null,
): void {
  if (!fc) {
    const existing = map.getSource("buildings") as GeoJSONSource | undefined;
    if (existing) {
      existing.setData({ type: "FeatureCollection", features: [] });
    }
    return;
  }
  setOrAddSource(map, "buildings", fc);
}
