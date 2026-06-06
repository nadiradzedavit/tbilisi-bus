"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import type { Locale, Vehicle } from "./types";

async function json<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useStops(locale: Locale = "en") {
  return useQuery({
    queryKey: ["stops", locale],
    queryFn: () => json<unknown[]>(`/api/stops?locale=${locale}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoutes(locale: Locale = "en") {
  return useQuery({
    queryKey: ["routes", locale],
    queryFn: () => json<unknown[]>(`/api/routes?locale=${locale}`),
    staleTime: 60 * 60 * 1000,
  });
}

export function useArrivals(stopId: string, locale: Locale = "en") {
  return useQuery({
    queryKey: ["arrivals", stopId, locale],
    queryFn: () =>
      json<unknown[]>(
        `/api/stops/${encodeURIComponent(stopId)}/arrival-times?locale=${locale}`,
      ),
    enabled: Boolean(stopId),
    refetchInterval: 30_000,
  });
}

export function usePlan() {
  return useMutation({
    mutationFn: (vars: {
      from: [number, number];
      to: [number, number];
      locale: Locale;
    }) =>
      json<unknown>("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      }),
  });
}

export function useVehicles(locale: Locale = "en", busId?: string) {
  return useQuery({
    queryKey: ["vehicles", locale, busId ?? null],
    queryFn: () =>
      json<Vehicle[]>(
        `/api/vehicles?locale=${locale}${busId ? `&busId=${encodeURIComponent(busId)}` : ""}`,
      ),
    refetchInterval: 15_000,
  });
}
