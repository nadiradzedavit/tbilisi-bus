"use client";

import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { BusStop, RoutePolylines, Vehicle } from "@/lib/types";
import { modeColor, modeLabel } from "@/lib/utils";
import { sanitizeColor } from "@/lib/safe";

const LEAFLET_STYLE_ID = "leaflet-dark-theme";

const LEAFLET_DARK_CSS = `@keyframes ping{0%{transform:scale(1);opacity:0.6}75%,100%{transform:scale(1.6);opacity:0}}.leaflet-container{background:#0a0e1a;font-family:inherit}.leaflet-control-zoom a{background:#131829!important;color:#e4e7ef!important;border-color:#1f2540!important}.leaflet-control-zoom a:hover{background:#1f2540!important}.leaflet-control-attribution{background:rgba(10,14,26,0.7)!important;color:#6b7280!important;font-size:10px!important}.leaflet-control-attribution a{color:#94a3b8!important}.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#131829!important;color:#e4e7ef!important;border:1px solid #1f2540}`;

const ANIM_MS = 1000;
const STALE_MS = 60_000;

function wrapAngle(d: number): number {
  return ((d + 540) % 360) - 180;
}

function makeStopIcon() {
  return L.icon({
    iconUrl: "/icons/bus-stop-sign.svg",
    iconSize: [18, 18],
    iconAnchor: [9, 16],
    popupAnchor: [0, -16],
  });
}

function makeBusIcon(color: string, label: string) {
  const c = sanitizeColor(color);
  return L.divIcon({
    className: "",
    iconSize: [18, 26],
    iconAnchor: [9, 8],
    popupAnchor: [0, -8],
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;line-height:1;"><div data-bus-rot style="filter:invert(17%) sepia(95%) saturate(7464%) hue-rotate(355deg) brightness(110%) contrast(115%) drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 2.5px #ff2d2d);"><img src="/icons/bus-stop-sign.svg" style="width:18px;height:18px;display:block;" /></div><div style="background:#0a0e1a;color:${c};font-weight:700;font-size:6px;padding:0px 3px;border-radius:3px;border:0.5px solid ${c};white-space:nowrap;font-family:ui-monospace,monospace;letter-spacing:0.2px;">${label}</div></div>`,
  });
}

function buildStopPopup(stop: BusStop): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.fontFamily = "inherit";
  const name = document.createElement("p");
  name.style.cssText = "margin:0 0 2px;font-size:13px;font-weight:600;color:#e4e7ef";
  name.textContent = stop.name;
  const meta = document.createElement("p");
  meta.style.cssText = "margin:0 0 4px;font-size:10px;color:#6b7280";
  meta.textContent = `${modeLabel(stop.vehicleMode)} · ${stop.code ?? "—"}`;
  const link = document.createElement("a");
  link.href = `/stops/${encodeURIComponent(stop.id)}`;
  link.textContent = "View arrivals →";
  link.style.cssText =
    "font-size:11px;font-weight:500;color:#2563eb;text-decoration:none";
  wrap.append(name, meta, link);
  return wrap;
}

function buildBusPopup(v: Vehicle): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.fontFamily = "inherit";
  const p = document.createElement("p");
  p.style.cssText = "margin:0;font-size:12px;font-weight:600;color:#e4e7ef";
  p.textContent = `Bus ${v.shortName}`;
  const sub = document.createElement("p");
  sub.style.cssText = "margin:2px 0 0;font-size:10px;color:#6b7280";
  if (v.nextStopId) {
    const link = document.createElement("a");
    link.href = `/stops/${encodeURIComponent(v.nextStopId)}`;
    link.textContent = `Next: ${v.nextStopId}`;
    link.style.cssText = "color:#94a3b8;text-decoration:none";
    wrap.append(p);
    sub.append(link);
    wrap.append(sub);
  } else {
    sub.textContent = "Live position";
    wrap.append(p, sub);
  }
  return wrap;
}

type BusAnim = {
  marker: L.Marker;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  fromHeading: number;
  toHeading: number;
  t0: number;
  stale: boolean;
  lastSeen: number;
  color: string;
  shortName: string;
  rotEl: HTMLElement | null;
};

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
}

export default function LiveMap({
  stops = [],
  vehicles = [],
  polyline,
  polylines,
  center = [41.7151, 44.8271],
  zoom = 12,
  className,
  fitPolyline = false,
  highlightKeys,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const polylineFwdRef = useRef<L.Polyline | null>(null);
  const polylineBwdRef = useRef<L.Polyline | null>(null);
  const stopMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const busStateRef = useRef<Map<string, BusAnim>>(new Map());
  const rafRef = useRef<number | null>(null);
  const highlightRef = useRef<Set<string> | undefined>(highlightKeys);
  highlightRef.current = highlightKeys;

  const tick = useCallback(() => {
    const t = performance.now();
    let active = false;
    const m = mapRef.current;
    for (const [key, s] of busStateRef.current) {
      if (s.stale) {
        if (t - s.lastSeen > STALE_MS) {
          s.marker.remove();
          busStateRef.current.delete(key);
        } else {
          active = true;
        }
        continue;
      }
      const u = Math.min(1, (t - s.t0) / ANIM_MS);
      const lat = s.fromLat + (s.toLat - s.fromLat) * u;
      const lon = s.fromLon + (s.toLon - s.fromLon) * u;
      const dh = wrapAngle(s.toHeading - s.fromHeading);
      const heading = (s.fromHeading + dh * u + 360) % 360;
      if (m) {
        s.marker.setLatLng([lat, lon]);
        if (s.rotEl) {
          s.rotEl.style.transform = `rotate(${heading}deg)`;
        }
      }
      if (u < 1) active = true;
    }
    if (active) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(LEAFLET_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = LEAFLET_STYLE_ID;
    style.textContent = LEAFLET_DARK_CSS;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center, zoom, zoomControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      busStateRef.current.forEach((s) => s.marker.remove());
      busStateRef.current.clear();
      stopMarkersRef.current.forEach((m) => m.remove());
      stopMarkersRef.current.clear();
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      if (polylineFwdRef.current) {
        polylineFwdRef.current.remove();
        polylineFwdRef.current = null;
      }
      if (polylineBwdRef.current) {
        polylineBwdRef.current.remove();
        polylineBwdRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    mapRef.current?.setView(center, zoom, { animate: true });
  }, [center[0], center[1], zoom]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (polylineFwdRef.current) {
      polylineFwdRef.current.remove();
      polylineFwdRef.current = null;
    }
    if (polylineBwdRef.current) {
      polylineBwdRef.current.remove();
      polylineBwdRef.current = null;
    }
    const allBounds: L.LatLngBounds[] = [];
    if (polylines) {
      if (polylines.forward.length > 1) {
        polylineFwdRef.current = L.polyline(polylines.forward, {
          color: "#2563eb",
          weight: 4,
          opacity: 0.7,
        }).addTo(m);
        allBounds.push(polylineFwdRef.current.getBounds());
      }
      if (polylines.backward.length > 1) {
        polylineBwdRef.current = L.polyline(polylines.backward, {
          color: "#f97316",
          weight: 4,
          opacity: 0.7,
          dashArray: "6 6",
        }).addTo(m);
        allBounds.push(polylineBwdRef.current.getBounds());
      }
    } else if (polyline && polyline.length > 1) {
      polylineRef.current = L.polyline(polyline, {
        color: "#2563eb",
        weight: 4,
        opacity: 0.55,
      }).addTo(m);
      allBounds.push(polylineRef.current.getBounds());
    }
    if (fitPolyline && allBounds.length > 0) {
      const merged = allBounds[0];
      for (let i = 1; i < allBounds.length; i++) merged.extend(allBounds[i]);
      m.fitBounds(merged, { padding: [24, 24], maxZoom: 15 });
    }
  }, [polyline, polylines, fitPolyline]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const nextStops = new Set<string>();
    for (const s of stops) {
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon)) continue;
      const dir = (s as BusStop & { direction?: string }).direction ?? "x";
      const key = `${s.id}-${dir}`;
      nextStops.add(key);
      const icon = makeStopIcon();
      const existing = stopMarkersRef.current.get(key);
      if (existing) {
        existing.setLatLng([s.lat, s.lon]);
        existing.setIcon(icon);
        existing.unbindPopup();
        existing.bindPopup(buildStopPopup(s));
      } else {
        const mk = L.marker([s.lat, s.lon], { icon })
          .addTo(m)
          .bindPopup(buildStopPopup(s));
        stopMarkersRef.current.set(key, mk);
      }
    }
    for (const [id, marker] of stopMarkersRef.current) {
      if (!nextStops.has(id)) {
        marker.remove();
        stopMarkersRef.current.delete(id);
      }
    }
  }, [stops]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const now = performance.now();
    const incoming = new Set<string>();
    for (const v of vehicles) {
      if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) continue;
      incoming.add(v.vehicleKey);
      const heading = v.heading ?? 0;
      const existing = busStateRef.current.get(v.vehicleKey);
      if (existing) {
        existing.fromLat = existing.toLat;
        existing.fromLon = existing.toLon;
        existing.fromHeading = existing.toHeading;
        existing.toLat = v.lat;
        existing.toLon = v.lon;
        existing.toHeading = heading;
        existing.t0 = now;
        existing.stale = false;
        existing.lastSeen = now;
        existing.color = v.color;
        existing.shortName = v.shortName;
        const popup = existing.marker.getPopup();
        if (popup) {
          popup.setContent(buildBusPopup(v));
        } else {
          existing.marker.bindPopup(buildBusPopup(v));
        }
      } else {
        const marker = L.marker([v.lat, v.lon], {
          icon: makeBusIcon(v.color, v.shortName),
        })
          .addTo(m)
          .bindPopup(buildBusPopup(v));
        const anim: BusAnim = {
          marker,
          fromLat: v.lat,
          fromLon: v.lon,
          toLat: v.lat,
          toLon: v.lon,
          fromHeading: heading,
          toHeading: heading,
          t0: now,
          stale: false,
          lastSeen: now,
          color: v.color,
          shortName: v.shortName,
          rotEl: null,
        };
        marker.on("add", () => {
          const el = marker.getElement();
          anim.rotEl = el?.querySelector("[data-bus-rot]") as HTMLElement | null;
          if (anim.rotEl) {
            anim.rotEl.style.transform = `rotate(${heading}deg)`;
          }
        });
        busStateRef.current.set(v.vehicleKey, anim);
      }
    }
    for (const [k, s] of busStateRef.current) {
      if (!incoming.has(k)) s.stale = true;
    }
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [vehicles, tick]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const hi = highlightRef.current;
    for (const [key, s] of busStateRef.current) {
      const dim = hi && !hi.has(key) && !s.stale;
      const el = s.marker.getElement();
      if (el) {
        el.style.opacity = dim ? "0.45" : "1";
        el.style.filter = dim ? "grayscale(0.5)" : "none";
      }
    }
  }, [highlightKeys, vehicles]);

  return <div ref={containerRef} className={className} />;
}
