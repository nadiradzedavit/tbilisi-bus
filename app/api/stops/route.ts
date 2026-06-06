import { NextResponse } from "next/server";
import { ttc } from "ttc-api";
import type { Locale } from "@/lib/types";

export const revalidate = 300;

function parseLocale(v: string | null): Locale {
  return v === "ka" ? "ka" : "en";
}

export async function GET(req: Request) {
  const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
  try {
    const data = await ttc.stops({ locale });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch (e) {
    console.error("stops failed", e);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
