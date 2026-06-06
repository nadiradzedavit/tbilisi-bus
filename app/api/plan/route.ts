import { NextResponse } from "next/server";
import { ttc } from "ttc-api";
import type { Locale } from "@/lib/types";

const MAX_BODY = 8192;

function isLatLng(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    v.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  let body: { from?: unknown; to?: unknown; locale?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!isLatLng(body.from) || !isLatLng(body.to)) {
    return NextResponse.json(
      { error: "from and to must be [lat, lon]" },
      { status: 400 },
    );
  }
  const locale: Locale = body.locale === "ka" ? "ka" : "en";
  try {
    const data = await ttc.plan({ from: body.from, to: body.to, locale });
    return NextResponse.json(data);
  } catch (e) {
    console.error("plan failed", e);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
