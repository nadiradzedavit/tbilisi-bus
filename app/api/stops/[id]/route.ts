import { NextResponse } from "next/server";
import { ttc, stopId } from "@/lib/ttc";

export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const normalizedId = stopId(id);
  try {
    const data = await ttc.stop(normalizedId);
    return NextResponse.json(data);
  } catch (e) {
    console.error("stop failed", e);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
