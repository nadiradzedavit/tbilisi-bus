import { NextResponse } from "next/server";
import { ttc, stopId } from "@/lib/ttc";
import type { Locale } from "@/lib/types";

export const revalidate = 600;

function parseLocale(v: string | null): Locale {
  return v === "ka" ? "ka" : "en";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
  const normalizedId = stopId(id);
  try {
    const data = await ttc.stopRoutes({ stopId: normalizedId, locale });
    return NextResponse.json(data);
  } catch (e) {
    console.error("stop-routes failed", e);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
