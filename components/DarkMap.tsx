"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import maplibregl, {
  Map as MLMap,
  Marker,
  type LngLatLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BusStop, DirectionFilter, RoutePolylines, StyleMode, Vehicle, VehicleMode } from "@/lib/types";
import { modeColor, modeLabel } from "@/lib/utils";
import { sanitizeColor } from "@/lib/safe";
import { STYLE_BUILDERS } from "@/lib/map/style";
import {
  updateBuildings,
  updateRoutes,
  updateStops,
  updateVehicles,
} from "@/lib/map/sources";
import { fetchTbilisiBuildings } from "@/lib/map/buildings";
import { inferDirectionByHeading, nearestPolylineDirection, normalizeStopId } from "@/lib/geo";
import MapVignette from "./MapVignette";

const ANIM_MS = 1000;
const STALE_MS = 60_000;

type BusAnim = {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  t0: number;
  stale: boolean;
  lastSeen: number;
  color: string;
  shortName: string;
  marker: Marker | null;
};

type StopWithDir = BusStop & { direction?: string };

export interface LiveMapProps {
  stops?: BusStop[];
  vehicles?: Vehicle[];
  polyline?: Array<[number, number]>;
  polylines?: RoutePolylines;
  center?: [number, number];
  zoom?: number;
  className?: string;
  fitPolyline?: boolean;
  highlightKeys?: Set<string>;
  directionFilter?: DirectionFilter;
  styleMode?: StyleMode;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function normHex(c: string | undefined | null): string {
  const bare = sanitizeColor(c);
  return bare.startsWith("#") ? bare : `#${bare}`;
}

function busElCss(color: string, dim: boolean): string {
  return [
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:1px 6px",
    "border-radius:5px",
    "background:rgba(10,14,26,0.92)",
    `border:1.5px solid ${color}`,
    `color:${color}`,
    "font-weight:800",
    "font-size:11px",
    "line-height:1.1",
    "font-family:ui-monospace,monospace",
    "letter-spacing:0.2px",
    "white-space:nowrap",
    "transform:translate(-50%,-140%)",
    "text-shadow:0 0 3px rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,0.85)",
    `box-shadow:0 0 12px ${color}aa, 0 0 3px ${color}, 0 2px 6px rgba(0,0,0,0.5)`,
    `opacity:${dim ? "0.5" : "1"}`,
    "pointer-events:auto",
    "cursor:pointer",
  ].join(";");
}

function stopElCss(mode: VehicleMode, dim: boolean): string {
  const color = modeColor(mode);
  return [
    "width:11px",
    "height:11px",
    "border-radius:50%",
    `background:${color}`,
    "border:2px solid #ffffff",
    "box-shadow:0 0 0 1px #0a0e1a, 0 0 8px 2px rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.5)",
    `opacity:${dim ? "0.5" : "1"}`,
    "transform:translate(-50%,-50%)",
    "pointer-events:auto",
    "cursor:pointer",
  ].join(";");
}

function buildBusLabelEl(
  shortName: string,
  color: string,
  dim: boolean,
): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", `Bus ${shortName}, live position`);
  el.style.cssText = busElCss(color, dim);
  el.textContent = shortName;
  return el;
}

function buildStopEl(
  name: string,
  mode: VehicleMode,
  dim: boolean,
): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", `Stop ${name}, ${modeLabel(mode)}`);
  el.style.cssText = stopElCss(mode, dim);
  return el;
}

function refreshBusEl(el: HTMLDivElement, color: string, shortName: string): void {
  el.style.cssText = busElCss(color, false);
  el.textContent = shortName;
  el.setAttribute("aria-label", `Bus ${shortName}, live position`);
}

function refreshStopEl(
  el: HTMLDivElement,
  name: string,
  mode: VehicleMode,
): void {
  el.style.cssText = stopElCss(mode, false);
  el.setAttribute("aria-label", `Stop ${name}, ${modeLabel(mode)}`);
}

function fitBoundsFromPolylines(
  map: MLMap,
  polylines?: RoutePolylines,
  polyline?: Array<[number, number]>,
): void {
  const coords: [number, number][] = [];
  if (polylines) {
    coords.push(...polylines.forward, ...polylines.backward);
  } else if (polyline) {
    coords.push(...polyline);
  }
  if (coords.length < 2) return;
  let minLon = coords[0][1], minLat = coords[0][0];
  let maxLon = coords[0][1], maxLat = coords[0][0];
  for (const [lat, lon] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  map.fitBounds(
    [[minLon, minLat], [maxLon, maxLat]],
    { padding: 48, duration: 1200, easing: easeOutCubic, maxZoom: 15.5, pitch: 45 },
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stopPopupHtml(s: StopWithDir): string {
  return `<div style="font-family:inherit;min-width:160px"><p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#f1f5f9">${escapeHtml(s.name)}</p><p style="margin:0 0 6px;font-size:10px;color:#94a3b8">${escapeHtml(modeLabel(s.vehicleMode))} · ${escapeHtml(s.code ?? "—")}</p><a href="/stops/${encodeURIComponent(s.id)}" style="font-size:11px;font-weight:500;color:#60a5fa;text-decoration:none">View arrivals →</a></div>`;
}

function busPopupHtml(v: Vehicle): string {
  return `<div style="font-family:inherit"><p style="margin:0;font-size:12px;font-weight:600;color:#f1f5f9">Bus ${escapeHtml(v.shortName)}</p><p style="margin:2px 0 0;font-size:10px;color:#94a3b8">${v.nextStopId ? `Next: <a href="/stops/${encodeURIComponent(v.nextStopId)}" style="color:#94a3b8;text-decoration:none">${escapeHtml(v.nextStopId)}</a>` : "Live position"}</p></div>`;
}

function attachPopupToggle(el: HTMLElement, marker: Marker): void {
  const handler = (e: Event) => {
    if (
      e instanceof KeyboardEvent &&
      e.key !== "Enter" &&
      e.key !== " "
    ) return;
    e.preventDefault();
    e.stopPropagation();
    marker.togglePopup();
  };
  el.addEventListener("click", handler);
  el.addEventListener("keydown", handler);
}

export default function DarkMap({
  stops = [],
  vehicles = [],
  polyline,
  polylines,
  center = [41.7151, 44.8271],
  zoom = 12,
  className,
  fitPolyline = false,
  highlightKeys,
  directionFilter = "both",
  styleMode = "dark",
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const busStateRef = useRef<Map<string, BusAnim>>(new Map());
  const stopMarkersRef = useRef<Map<string, Marker>>(new Map());
  const stopSnapRef = useRef<Map<string, { name: string; mode: VehicleMode; code: string; lat: number; lon: number }>>(new Map());
  const stopDirRef = useRef<Map<string, "forward" | "backward">>(new Map());
  const rafRef = useRef<number | null>(null);
  const highlightRef = useRef<Set<string> | undefined>(highlightKeys);
  highlightRef.current = highlightKeys;
  const stopsRef = useRef<StopWithDir[]>(stops as StopWithDir[]);
  stopsRef.current = stops as StopWithDir[];
  const vehiclesRef = useRef<Vehicle[]>(vehicles);
  vehiclesRef.current = vehicles;
  const centerRef = useRef<[number, number]>(center);
  centerRef.current = center;
  const zoomRef = useRef<number>(zoom);
  zoomRef.current = zoom;
  const polylineRef = useRef<Array<[number, number]> | undefined>(polyline);
  polylineRef.current = polyline;
  const polylinesRef = useRef<RoutePolylines | undefined>(polylines);
  polylinesRef.current = polylines;
  const directionFilterRef = useRef<DirectionFilter>(directionFilter);
  directionFilterRef.current = directionFilter;
  const [ready, setReady] = useState(false);
  const didInitFitRef = useRef(false);
  const didIntroRef = useRef(false);
  const lastBuildingsRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const appliedStyleRef = useRef<StyleMode>(styleMode);

  const routeColor = useMemo(() => {
    const v = vehicles[0];
    if (v) return normHex(v.color);
    return "#2563eb";
  }, [vehicles]);

  const fitKey = useMemo(() => {
    if (polylines) {
      return `p:${polylines.forward.length}-${polylines.backward.length}|${polylines.forward[0]?.join(",") ?? ""}-${polylines.forward.at(-1)?.join(",") ?? ""}|${polylines.backward[0]?.join(",") ?? ""}-${polylines.backward.at(-1)?.join(",") ?? ""}`;
    }
    if (polyline) {
      return `l:${polyline.length}|${polyline[0]?.join(",") ?? ""}-${polyline.at(-1)?.join(",") ?? ""}`;
    }
    return "none";
  }, [polylines, polyline]);

  const scheduleTick = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const tick = useCallback(() => {
    rafRef.current = null;
    const t = performance.now();
    const map = mapRef.current;
    let hasMoving = false;
    let hasStale = false;
    const feats: GeoJSON.Feature[] = [];

    for (const [key, s] of busStateRef.current) {
      if (s.stale) {
        if (t - s.lastSeen > STALE_MS) {
          if (s.marker) {
            const p = s.marker.getPopup();
            if (p) p.remove();
            s.marker.remove();
          }
          busStateRef.current.delete(key);
        } else {
          hasStale = true;
        }
        continue;
      }
      const u = Math.min(1, (t - s.t0) / ANIM_MS);
      const lat = s.fromLat + (s.toLat - s.fromLat) * u;
      const lon = s.fromLon + (s.toLon - s.fromLon) * u;
      if (s.marker) s.marker.setLngLat([lon, lat]);
      if (u < 1) hasMoving = true;
      feats.push({
        type: "Feature",
        id: key,
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
          vehicleKey: key,
          color: s.color,
          shortName: s.shortName,
        },
      });
    }

    if (map && hasMoving) {
      const src = map.getSource("vehicles") as
        | { setData: (d: GeoJSON.FeatureCollection) => void }
        | undefined;
      if (src) {
        src.setData({ type: "FeatureCollection", features: feats });
      }
    }

    if (hasMoving || hasStale) scheduleTick();
  }, [scheduleTick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_BUILDERS[appliedStyleRef.current](),
      center: [center[1], center[0]] as LngLatLike,
      zoom,
      pitch: 0,
      bearing: 0,
      maxPitch: 85,
      attributionControl: { compact: true },
      cooperativeGestures: false,
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
      "top-right",
    );
    map.on("load", () => {
      if (cancelled) return;
      const mode = appliedStyleRef.current;
      addCoreLayers(map, mode);
      setReady(true);
      if (!didIntroRef.current) {
        didIntroRef.current = true;
        if (!fitPolyline) {
          const target = mode === "satellite"
            ? { pitch: 60, bearing: -20, zoom: Math.max(zoom, 13.5) }
            : { pitch: 45, bearing: 0, zoom };
          map.flyTo({
            center: [center[1], center[0]] as LngLatLike,
            ...target,
            duration: 2500,
            easing: easeOutCubic,
          });
        }
      }
    });
    map.on("styledata", () => {
      const m = mapRef.current;
      if (!m || cancelled) return;
      if (!m.getSource("vehicles")) {
        addCoreLayers(m, appliedStyleRef.current);
        updateRoutes(
          m,
          polylinesRef.current,
          polylineRef.current,
          routeColor,
          directionFilterRef.current,
        );
        updateStops(m, stopsRef.current);
        updateVehicles(m, vehiclesRef.current, highlightRef.current);
        updateBuildings(m, lastBuildingsRef.current);
        m.triggerRepaint();
      }
    });
    map.on("error", (e) => {
      const err = e?.error as { status?: number; sourceId?: string } | undefined;
      const sourceId = err?.sourceId ?? "";
      const isTileMiss = (sourceId.startsWith("carto-") || sourceId.startsWith("esri-")) && err?.status === 404;
      if (!isTileMiss && err) {
        // eslint-disable-next-line no-console
        console.warn("[map]", err);
      }
    });
    mapRef.current = map;
    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      busStateRef.current.forEach((s) => {
        const p = s.marker?.getPopup();
        if (p) p.remove();
        s.marker?.remove();
      });
      busStateRef.current.clear();
      stopMarkersRef.current.forEach((m) => {
        const p = m.getPopup();
        if (p) p.remove();
        m.remove();
      });
      stopMarkersRef.current.clear();
      stopSnapRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addCoreLayers(map: MLMap, mode: StyleMode) {
    if (map.getLayer("buildings")) return;
    const ids = ["vehicles", "routes", "stops", "buildings"] as const;
    for (const id of ids) {
      if (!map.getSource(id)) {
        map.addSource(id, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }
    }

    const isSat = mode === "satellite";
    map.addLayer({
      id: "buildings",
      type: "fill-extrusion",
      source: "buildings",
      minzoom: 13.5,
      paint: {
        "fill-extrusion-color": isSat
          ? "rgba(190, 205, 230, 0.45)"
          : "#1a2240",
        "fill-extrusion-height": ["coalesce", ["get", "height"], 12],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": isSat ? 0.9 : 0.7,
        "fill-extrusion-vertical-gradient": true,
      },
    });

    map.addLayer({
      id: "route-glow",
      type: "line",
      source: "routes",
      filter: ["==", ["get", "dashed"], false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#2563eb"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 5, 16, 18],
        "line-blur": 14,
        "line-opacity": isSat ? 0.75 : 0.55,
      },
    });
    map.addLayer({
      id: "route-core",
      type: "line",
      source: "routes",
      filter: ["==", ["get", "dashed"], false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#2563eb"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2.2, 16, 7],
        "line-opacity": 0.95,
      },
    });
    map.addLayer({
      id: "route-dash",
      type: "line",
      source: "routes",
      filter: ["==", ["get", "dashed"], true],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#f97316"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.6, 16, 5],
        "line-dasharray": [2, 1.4],
        "line-opacity": 0.95,
      },
    });

    map.addLayer({
      id: "stops-bg",
      type: "circle",
      source: "stops",
      paint: {
        "circle-radius": isSat ? 12 : 8,
        "circle-color": isSat ? "#ffffff" : "#94a3b8",
        "circle-opacity": isSat ? 0.35 : 0.18,
        "circle-blur": isSat ? 0.4 : 0.6,
      },
    });
    map.addLayer({
      id: "stops",
      type: "circle",
      source: "stops",
      paint: {
        "circle-radius": isSat ? 5 : 3.5,
        "circle-color": isSat ? "#ffffff" : "#cbd5e1",
        "circle-stroke-color": isSat ? "#0a0e1a" : "#0a0e1a",
        "circle-stroke-width": isSat ? 2 : 1.5,
      },
    });

    map.addLayer({
      id: "bus-glow",
      type: "circle",
      source: "vehicles",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 12, 16, 26],
        "circle-color": ["coalesce", ["get", "color"], "#2563eb"],
        "circle-opacity": isSat ? 0.6 : 0.35,
        "circle-blur": isSat ? 1.4 : 1.0,
      },
    });
    map.addLayer({
      id: "bus-core",
      type: "circle",
      source: "vehicles",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 16, 7],
        "circle-color": ["coalesce", ["get", "color"], "#2563eb"],
        "circle-stroke-color": isSat ? "#ffffff" : "#0a0e1a",
        "circle-stroke-width": isSat ? 2.5 : 1.5,
        "circle-opacity": 1,
      },
    });
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    updateRoutes(
      map,
      polylinesRef.current,
      polylineRef.current,
      routeColor,
      directionFilterRef.current,
    );
  }, [ready, routeColor, polyline, polylines, directionFilter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    updateStops(map, stopsRef.current);
    const desired = new Map<string, StopWithDir>();
    for (const s of stopsRef.current) {
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon)) continue;
      const dir = s.direction ?? "x";
      desired.set(`${s.id}-${dir}`, s);
    }
    for (const [key, marker] of stopMarkersRef.current) {
      if (!desired.has(key)) {
        const p = marker.getPopup();
        if (p) p.remove();
        marker.remove();
        stopMarkersRef.current.delete(key);
        stopSnapRef.current.delete(key);
      }
    }
    const liveStopIds = new Set(Array.from(desired.values()).map((s) => s.id));
    for (const id of Array.from(stopDirRef.current.keys())) {
      if (!liveStopIds.has(id)) stopDirRef.current.delete(id);
    }
    for (const [key, s] of desired) {
      const existing = stopMarkersRef.current.get(key);
      const prev = stopSnapRef.current.get(key);
      if (existing) {
        existing.setLngLat([s.lon, s.lat]);
        if (
          !prev ||
          prev.name !== s.name ||
          prev.mode !== s.vehicleMode ||
          prev.code !== (s.code ?? "") ||
          prev.lat !== s.lat ||
          prev.lon !== s.lon
        ) {
          refreshStopEl(existing.getElement() as HTMLDivElement, s.name, s.vehicleMode);
          const p = existing.getPopup();
          if (p) p.setHTML(stopPopupHtml(s));
        }
        stopSnapRef.current.set(key, {
          name: s.name,
          mode: s.vehicleMode,
          code: s.code ?? "",
          lat: s.lat,
          lon: s.lon,
        });
        if (s.direction === "forward" || s.direction === "backward") {
          stopDirRef.current.set(s.id, s.direction);
        }
        continue;
      }
      const el = buildStopEl(s.name, s.vehicleMode, false);
      const popup = new maplibregl.Popup({
        offset: 12,
        closeButton: false,
      }).setHTML(stopPopupHtml(s));
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([s.lon, s.lat])
        .setPopup(popup)
        .addTo(map);
      attachPopupToggle(el, marker);
      stopMarkersRef.current.set(key, marker);
      stopSnapRef.current.set(key, {
        name: s.name,
        mode: s.vehicleMode,
        code: s.code ?? "",
        lat: s.lat,
        lon: s.lon,
      });
      if (s.direction === "forward" || s.direction === "backward") {
        stopDirRef.current.set(s.id, s.direction);
      }
    }
  }, [ready, stops]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const polylines = polylinesRef.current;
    const filter = directionFilterRef.current;
    const scope =
      filter === "both"
        ? vehicles
        : vehicles.filter((v) => {
            if (v.nextStopId) {
              for (const k of normalizeStopId(v.nextStopId)) {
                const d = stopDirRef.current.get(k);
                if (d) return d === filter;
              }
            }
            if (polylines) {
              const byHeading = inferDirectionByHeading(
                [v.lat, v.lon],
                v.heading,
                polylines.forward,
                polylines.backward,
              );
              if (byHeading) return byHeading === filter;
              const byPosition = nearestPolylineDirection(
                [v.lat, v.lon],
                polylines.forward,
                polylines.backward,
              );
              if (byPosition) return byPosition === filter;
            }
            return true;
          });
    const now = performance.now();
    const incoming = new Set<string>();
    for (const v of scope) {
      if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) continue;
      incoming.add(v.vehicleKey);
      const color = normHex(v.color);
      const existing = busStateRef.current.get(v.vehicleKey);
      if (existing) {
        existing.fromLat = existing.toLat;
        existing.fromLon = existing.toLon;
        existing.toLat = v.lat;
        existing.toLon = v.lon;
        existing.t0 = now;
        existing.stale = false;
        existing.lastSeen = now;
        const colorChanged = existing.color !== color;
        existing.color = color;
        const nameChanged = existing.shortName !== v.shortName;
        existing.shortName = v.shortName;
        if (existing.marker) {
          const el = existing.marker.getElement() as HTMLDivElement;
          if (colorChanged || nameChanged) {
            refreshBusEl(el, color, v.shortName);
          }
          if (nameChanged) {
            const p = existing.marker.getPopup();
            if (p) p.setHTML(busPopupHtml(v));
          }
        }
      } else {
        const el = buildBusLabelEl(v.shortName, color, false);
        const popup = new maplibregl.Popup({
          offset: 18,
          closeButton: false,
        }).setHTML(busPopupHtml(v));
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.lon, v.lat])
          .setPopup(popup)
          .addTo(map);
        attachPopupToggle(el, marker);
        busStateRef.current.set(v.vehicleKey, {
          fromLat: v.lat,
          fromLon: v.lon,
          toLat: v.lat,
          toLon: v.lon,
          t0: now,
          stale: false,
          lastSeen: now,
          color,
          shortName: v.shortName,
          marker,
        });
      }
    }
    for (const [k, s] of busStateRef.current) {
      if (incoming.has(k)) continue;
      if (filter !== "both") {
        if (s.marker) {
          const p = s.marker.getPopup();
          if (p) p.remove();
          s.marker.remove();
        }
        busStateRef.current.delete(k);
      } else {
        s.stale = true;
      }
    }
    updateVehicles(map, scope, highlightRef.current);
    scheduleTick();
  }, [vehicles, ready, scheduleTick, directionFilter, polylines]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const hi = highlightKeys;
    const applyDim = (el: HTMLDivElement, dim: boolean) => {
      el.style.opacity = dim ? "0.35" : "1";
    };
    if (!hi || hi.size === 0) {
      for (const [, s] of busStateRef.current) {
        if (s.marker) applyDim(s.marker.getElement() as HTMLDivElement, false);
      }
    } else {
      for (const [key, s] of busStateRef.current) {
        if (!s.marker) continue;
        applyDim(s.marker.getElement() as HTMLDivElement, !hi.has(key));
      }
    }
    updateVehicles(map, vehiclesRef.current, hi);
  }, [highlightKeys, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (didInitFitRef.current) {
      map.flyTo({
        center: [center[1], center[0]] as LngLatLike,
        zoom,
        duration: 1200,
        easing: easeOutCubic,
      });
    } else {
      didInitFitRef.current = true;
    }
  }, [center[0], center[1], zoom, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (fitPolyline) {
      fitBoundsFromPolylines(map, polylinesRef.current, polylineRef.current);
    }
  }, [ready, fitPolyline, fitKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;
    (async () => {
      const fc = await fetchTbilisiBuildings();
      if (cancelled) return;
      const mapNow = mapRef.current;
      if (!mapNow) return;
      lastBuildingsRef.current = fc;
      updateBuildings(mapNow, fc);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (appliedStyleRef.current === styleMode) return;
    appliedStyleRef.current = styleMode;
    map.setStyle(STYLE_BUILDERS[styleMode]());
    if (styleMode === "satellite") {
      const c = map.getCenter();
      const z = map.getZoom();
      map.flyTo({
        center: [c.lng, c.lat] as LngLatLike,
        zoom: Math.max(z, 13.5),
        pitch: 60,
        bearing: -20,
        duration: 2200,
        easing: easeOutCubic,
      });
    }
  }, [styleMode, ready]);

  return (
    <div
      className={`dark-map ${styleMode === "satellite" ? "is-satellite" : ""} ${className ?? ""}`}
      style={{ position: "relative" }}
      role="application"
      aria-label="Live transit map"
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <MapVignette />
    </div>
  );
}
