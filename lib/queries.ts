"use client";

import { useEffect, useRef, useState } from "react";
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
    refetchInterval: () => 2500 + Math.floor(Math.random() * 1000),
  });
}

export function useVehicleStream(locale: Locale = "en"): {
  vehicles: Vehicle[];
  isConnected: boolean;
} {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const retryRef = useRef(0);

  const MAX_RETRIES = 3;
  const MAX_DELAY = 30000;

  const { data: polledData } = useQuery({
    queryKey: ["vehicles-fallback", locale],
    queryFn: () => json<Vehicle[]>(`/api/vehicles?locale=${locale}`),
    enabled: useFallback,
    refetchInterval: () => 2500 + Math.floor(Math.random() * 1000),
  });

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    retryRef.current = 0;

    const cleanup = () => {
      if (es) {
        es.close();
        es = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connect = () => {
      cleanup();
      es = new EventSource(`/api/vehicles/stream?locale=${locale}`);

      es.onopen = () => {
        setIsConnected(true);
        retryRef.current = 0;
        setUseFallback(false);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setVehicles(data.vehicles ?? data);
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        es?.close();
        es = null;

        if (retryRef.current < MAX_RETRIES) {
          const delay = Math.min(
            1000 * Math.pow(2, retryRef.current),
            MAX_DELAY,
          );
          retryRef.current++;
          reconnectTimer = setTimeout(connect, delay);
        } else {
          setUseFallback(true);
        }
      };
    };

    connect();

    return () => {
      cleanup();
      retryRef.current = 0;
    };
  }, [locale]);

  const activeVehicles = isConnected ? vehicles : (polledData ?? vehicles);
  return { vehicles: activeVehicles, isConnected };
}
