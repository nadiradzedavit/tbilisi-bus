import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Bus } from "lucide-react";
import RouteBadge from "@/components/RouteBadge";
import RouteMapClient from "@/components/RouteMapClient";
import { safeBusRoutes, safeLocations, safeStops, stopId, ttc } from "@/lib/ttc";
import { decodePolyline } from "@/lib/polyline";
import type { Bus as BusType, Locale, RoutePolylines, RouteStop } from "@/lib/types";
import type { BusStop } from "@/lib/types";

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = (() => {
    try {
      return decodeURIComponent(rawId);
    } catch {
      return rawId;
    }
  })();
  const h = await headers();
  const locale: Locale = h.get("x-locale") === "ka" ? "ka" : "en";
  const idCandidates = Array.from(
    new Set([id, id.startsWith("1:") ? id : `1:${id}`, id.split(":").pop() ?? id]),
  );

  let route: BusType | null = null;
  let stops: RouteStop[] = [];
  let livePositions: Array<{
    lat: number;
    lon: number;
    heading: number | null;
    nextStopId: string | null;
    direction: "forward" | "backward";
  }> = [];
  try {
    const allRoutes = (await ttc.routes({ locale })) as BusType[];
    route =
      allRoutes.find((r) => idCandidates.includes(r.id)) ??
      allRoutes.find((r) => idCandidates.includes(r.shortName)) ??
      null;
    const matchedId = route?.id;
    if (matchedId) {
      const orderedCandidates = [
        matchedId,
        ...idCandidates.filter((c) => c !== matchedId),
      ];
      let resolvedId: string | null = null;
      for (const candidate of orderedCandidates) {
        const [fwd, bwd] = await Promise.all([
          safeBusRoutes({ busId: candidate, locale, forward: true }),
          safeBusRoutes({ busId: candidate, locale, forward: false }),
        ]);
        if (fwd.length > 0 && bwd.length > 0) {
          resolvedId = candidate;
          const byId = new Map<string, RouteStop>();
          for (const s of fwd) byId.set(s.id, { ...s, direction: "forward" });
          for (const s of bwd) {
            const ex = byId.get(s.id);
            byId.set(s.id, ex ? { ...ex, ...s, direction: "forward" } : { ...s, direction: "backward" });
          }
          stops = Array.from(byId.values());
          break;
        }
        if (fwd.length > 0 || bwd.length > 0) {
          const only = fwd.length > 0 ? fwd : bwd;
          const dir: "forward" | "backward" = fwd.length > 0 ? "forward" : "backward";
          resolvedId = candidate;
          stops = only.map((s): RouteStop => ({ ...s, direction: dir }));
          break;
        }
      }
      if (stops.length === 0 && resolvedId) {
        try {
          const [locsFwd, locsBwd] = await Promise.all([
            safeLocations({ busId: resolvedId, forward: true }),
            safeLocations({ busId: resolvedId, forward: false }),
          ]);
          const locs = [
            ...locsFwd.map((x) => ({ x, dir: "forward" as const })),
            ...locsBwd.map((x) => ({ x, dir: "backward" as const })),
          ];
          if (locs.length > 0) {
            livePositions = locs.map(({ x, dir }) => ({
              lat: x.lat,
              lon: x.lon,
              heading: x.heading ?? null,
              nextStopId: x.nextStopId ?? null,
              direction: dir,
            }));
          }
        } catch {
          // Error swallowed by safeLocations
        }
        if (stops.length === 0 && livePositions.length > 0) {
          try {
            const allStops = await safeStops({ locale });
            const byId = new Map(allStops.map((s) => [s.id, s]));
            const seen = new Set<string>();
            const synth: RouteStop[] = [];
            for (const p of livePositions) {
              if (!p.nextStopId) continue;
              const s = byId.get(p.nextStopId);
              if (s && !seen.has(s.id)) {
                seen.add(s.id);
                synth.push({ ...s, direction: p.direction });
              }
            }
            if (synth.length) stops = synth;
          } catch {
            // Error swallowed by safeStops
          }
        }
      }
    }
  } catch {
    stops = [];
    route = null;
  }

  let polylines: RoutePolylines = { forward: [], backward: [] };
  if (route) {
    try {
      const bareId = stopId(route.id);
      const [encFwd, encBwd] = await Promise.all([
        ttc.busPolyline({ busId: bareId, forward: true }),
        ttc.busPolyline({ busId: bareId, forward: false }),
      ]);
      const fwdEnc = (encFwd as { encodedValue?: string } | null)?.encodedValue;
      const bwdEnc = (encBwd as { encodedValue?: string } | null)?.encodedValue;
      polylines = {
        forward: fwdEnc ? decodePolyline(fwdEnc) : [],
        backward: bwdEnc ? decodePolyline(bwdEnc) : [],
      };
    } catch {
      /* polyline unavailable */
    }
  }

  if (!route) {
    return (
      <section className="mx-auto max-w-3xl py-8">
        <Link
          href="/routes"
          className="ring-focus mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Route not found.
        </div>
      </section>
    );
  }

  const center: [number, number] = stops.length
    ? [
        stops.reduce((s, p) => s + p.lat, 0) / stops.length,
        stops.reduce((s, p) => s + p.lon, 0) / stops.length,
      ]
    : livePositions.length
      ? [
          livePositions.reduce((s, p) => s + p.lat, 0) / livePositions.length,
          livePositions.reduce((s, p) => s + p.lon, 0) / livePositions.length,
        ]
      : [41.7151, 44.8271];

  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link
        href="/routes"
        className="ring-focus mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All routes
      </Link>
      <div className="mb-6 flex items-start gap-4">
        <RouteBadge shortName={route.shortName} color={route.color} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-fg">
            {route.longName}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-2xs text-fg-dim">
            <Bus className="h-3 w-3" aria-hidden="true" /> Bus route ·{" "}
            <span className="tabular">{stops.length}</span> stops
          </p>
        </div>
      </div>
      {stops.length > 0 || livePositions.length > 0 ? (
        <div className="h-96 w-full">
          <RouteMapClient
            stops={stops}
            center={center}
            zoom={12}
            route={{ id: route.id, shortName: route.shortName, color: route.color }}
            polylines={polylines}
            locale={locale}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-fg-muted">
          No stops data for this route.
        </div>
      )}
      {stops.length === 0 && livePositions.length > 0 && (
        <p className="mt-3 text-2xs text-fg-dim">
          Stop list unavailable from upstream — showing <span className="tabular">{livePositions.length}</span> live {livePositions.length === 1 ? "position" : "positions"} on the map.
        </p>
      )}
      {stops.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-fg">Stops</h2>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {stops.map((s) => (
              <li key={`${s.id}-${s.direction}`}>
                <Link
                  href={`/stops/${encodeURIComponent(s.id)}`}
                  className="ring-focus flex items-center justify-between rounded-md border border-border bg-bg-card/40 px-3 py-2 text-sm transition-colors hover:border-brand-bus/40 hover:bg-bg-card/60"
                >
                  <span className="truncate text-fg">{s.name}</span>
                  {s.code && (
                    <span className="tabular text-2xs text-fg-dim">
                      {s.code}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
