import { headers } from "next/headers";
import ArrivalBoard from "@/components/ArrivalBoard";
import StopMapClient from "@/components/StopMapClient";
import { Skeleton } from "@/components/Skeleton";
import { modeColor, modeLabel } from "@/lib/utils";
import { safeStop, safeStops } from "@/lib/ttc";
import { MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import type { BusStop } from "ttc-api/types";

function isTbilisi(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= 41.5 && lat <= 42.0 && lon >= 44.5 && lon <= 45.1
  );
}

export default async function StopDetailPage({
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
  const locale = h.get("x-locale") === "ka" ? "ka" : "en";
  const candidates = [
    id,
    id.startsWith("1:") ? id : `1:${id}`,
    id.split(":").pop() ?? id,
  ];
  let stop: BusStop | null = null;
  for (const sid of candidates) {
    stop = await safeStop(sid);
    if (stop && isTbilisi(stop.lat, stop.lon)) {
      break;
    }
  }
  if (!stop) {
    try {
      const found = await safeStops({ locale });
      const match = found.find(
        (s) =>
          candidates.includes(s.id) ||
          candidates.includes(s.code ?? ""),
      );
      if (match && isTbilisi(match.lat, match.lon)) stop = match;
    } catch (e) {
      // Error swallowed by safeStops
    }
  }

  if (!stop) {
    return (
      <section className="mx-auto max-w-3xl py-8">
        <Link
          href="/stops"
          className="ring-focus mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> {locale === "ka" ? "უკან" : "Back"}
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {locale === "ka"
            ? "გაჩერება ვერ მოიძებნა. სცადეთ სხვა."
            : "Couldn't load this stop. Try another."}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link
        href="/stops"
        className="ring-focus mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" /> All stops
      </Link>
      <div className="mb-6 flex items-start gap-4">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-lg"
          style={{
            background: `${modeColor(stop.vehicleMode)}22`,
            color: modeColor(stop.vehicleMode),
            border: `1px solid ${modeColor(stop.vehicleMode)}55`,
          }}
        >
          <MapPin className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-fg">
            {stop.name}
          </h1>
          <p className="mt-1 text-2xs text-fg-dim">
            {stop.code && <span className="tabular">{stop.code} · </span>}
            {modeLabel(stop.vehicleMode, "en")} ·{" "}
            <span className="tabular">
              {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
            </span>
          </p>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        }
      >
        <ArrivalBoard stopId={stop.id} locale={locale} />
      </Suspense>
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-fg">
          {locale === "ka" ? "მოახლოებული ავტობუსები" : "Buses approaching"}
        </h2>
        <StopMapClient stop={stop} locale={locale} />
      </div>
    </section>
  );
}
