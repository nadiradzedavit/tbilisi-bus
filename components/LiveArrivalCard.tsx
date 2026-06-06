"use client";

import { motion } from "framer-motion";
import { Clock, Radio } from "lucide-react";
import RouteBadge from "./RouteBadge";
import { cn, formatMinutes } from "@/lib/utils";
import { sanitizeColor } from "@/lib/safe";
import type { Locale } from "@/lib/types";

export default function LiveArrivalCard({
  arrival,
  locale = "en",
  index = 0,
}: {
  arrival: {
    shortName: string;
    color: string;
    headsign: string;
    realtime: boolean;
    realtimeArrivalMinutes: number;
    scheduledArrivalMinutes: number;
  };
  locale?: Locale;
  index?: number;
}) {
  const min = arrival.realtime
    ? arrival.realtimeArrivalMinutes
    : arrival.scheduledArrivalMinutes;
  const imminent = min <= 2;
  const c = sanitizeColor(arrival.color);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-bg-card/60 p-3 transition-colors glass-hover",
        imminent ? "border-status-live/40 shadow-glow-live" : "border-border",
      )}
    >
      {imminent && (
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl"
          style={{ background: `#${c}` }}
          aria-hidden
        />
      )}
      <div className="relative flex items-center gap-3">
        <RouteBadge shortName={arrival.shortName} color={c} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">
            {arrival.headsign || "—"}
          </p>
          <p className="flex items-center gap-1.5 text-2xs text-fg-dim">
            {arrival.realtime ? (
              <>
                <Radio className="h-2.5 w-2.5 text-status-live" strokeWidth={3} />
                <span className="text-status-live">LIVE</span>
              </>
            ) : (
              <>
                <Clock className="h-2.5 w-2.5" />
                <span>scheduled</span>
              </>
            )}
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "tabular text-lg font-semibold leading-none",
              imminent ? "text-status-live" : "text-fg",
            )}
          >
            {formatMinutes(min, locale)}
          </p>
          {arrival.realtime && arrival.scheduledArrivalMinutes !== min && (
            <p className="mt-0.5 text-2xs text-fg-dim tabular">
              sched {formatMinutes(arrival.scheduledArrivalMinutes, locale)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
