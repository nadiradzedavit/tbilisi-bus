import { NextResponse } from "next/server";
import { ttc } from "ttc-api";
import type { Locale } from "@/lib/types";

export const revalidate = 3600;

function parseLocale(v: string | null): Locale {
  return v === "ka" ? "ka" : "en";
}

export async function GET(req: Request) {
  const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
  try {
    const data = await ttc.routes({ locale });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
    });
  } catch (e) {
    console.error("routes failed", e);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
