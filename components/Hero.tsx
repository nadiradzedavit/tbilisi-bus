"use client";

import { motion } from "framer-motion";
import { ArrowRight, MapPin, Radio, Sparkles } from "lucide-react";
import Link from "next/link";
import { useStops } from "@/lib/queries";
import StopSearch from "./StopSearch";
import { FEATURED_STOP_ID } from "@/lib/types";
import type { BusStop, Locale } from "@/lib/types";

export default function Hero({ locale = "en" }: { locale?: Locale }) {
  const { data } = useStops(locale);
  const featured = (data as BusStop[] | undefined)?.find(
    (s) => s.id === FEATURED_STOP_ID,
  );
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg mask-fade-b" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-brand-bus/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-1/4 top-20 h-40 w-40 rounded-full bg-status-live/15 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col gap-6"
        >
          <div className="flex items-center gap-2 self-start rounded-full border border-status-live/30 bg-status-live/5 px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-status-live">
            <Radio className="h-3 w-3 animate-pulse-live" strokeWidth={3} />
            Live from TTC
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-5xl md:text-6xl">
            Tbilisi transit,{" "}
            <span className="gradient-text">live arrivals</span>
            <br className="hidden sm:block" />
            <span className="text-fg-muted"> at every stop.</span>
          </h1>
          <p className="max-w-xl text-pretty text-base text-fg-muted sm:text-lg">
            Real-time bus arrivals, route maps, and journey planning — all in
            one place. No sign-up. No ads. Just the next bus.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/stops/${encodeURIComponent(FEATURED_STOP_ID)}`}
              className="ring-focus inline-flex items-center gap-2 rounded-md bg-brand-bus px-4 py-2.5 text-sm font-semibold text-white shadow-glow-bus transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <MapPin className="h-4 w-4" />
              Beri Gabriel Salosi · #120
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/plan"
              className="ring-focus inline-flex items-center gap-2 rounded-md border border-border bg-bg-card/60 px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-bg-card"
            >
              <Sparkles className="h-4 w-4 text-status-live" />
              Plan a trip
            </Link>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="mt-10"
        >
          <StopSearch locale={locale} />
          {featured && (
            <p className="mt-3 text-2xs text-fg-dim">
              Showing {featured.name} as a featured stop
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
