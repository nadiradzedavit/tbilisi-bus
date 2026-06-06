import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { VehicleMode } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMinutes(min: number, locale: "ka" | "en" = "en"): string {
  if (min <= 0) return locale === "ka" ? "ახლა" : "Now";
  if (min === 1) return locale === "ka" ? "1 წთ" : "1 min";
  return locale === "ka" ? `${min} წთ` : `${min} min`;
}

export function modeColor(mode: VehicleMode): string {
  switch (mode) {
    case "BUS":
      return "#2563eb";
    case "GONDOLA":
      return "#16a34a";
    case "SUBWAY":
      return "#0891b2";
    default:
      return "#64748b";
  }
}

export function modeLabel(mode: VehicleMode, locale: "ka" | "en" = "en"): string {
  if (locale === "ka") {
    return mode === "BUS" ? "ავტობუსი" : mode === "GONDOLA" ? "გონდოლა" : "მეტრო";
  }
  return mode === "BUS" ? "Bus" : mode === "GONDOLA" ? "Cable Car" : "Metro";
}
