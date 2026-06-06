import type { Locale } from "./types";

export function sanitizeColor(input: string | undefined | null): string {
  if (!input) return "64748b";
  const s = String(input).trim().replace("#", "").toLowerCase();
  return /^[0-9a-f]{3,8}$/.test(s) ? s : "64748b";
}

export function parseLocale(v: string | null | undefined): Locale {
  return v === "ka" ? "ka" : "en";
}
