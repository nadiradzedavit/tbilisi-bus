import { NextRequest } from "next/server";
import { fetchAllVehicles } from "@/lib/fetchVehicles";
import { parseLocale } from "@/lib/safe";

export const dynamic = "force-dynamic";

const MIN_DELAY_MS = 100;
const MAX_DELAY_MS = 300;
const ABORT_POLL_MS = 100;

export async function GET(req: NextRequest) {
  const locale = parseLocale(req.nextUrl.searchParams.get("locale"));

  let aborted = false;
  req.signal.addEventListener("abort", () => {
    aborted = true;
  });

  const stream = new ReadableStream({
    start(controller) {
      const safeEnqueue = (data: string) => {
        if (aborted) return;
        try {
          controller.enqueue(new TextEncoder().encode(data));
        } catch {
          aborted = true;
        }
      };

      safeEnqueue("retry: 1000\n\n");

      const loop = async () => {
        while (!aborted) {
          try {
            const vehicles = await fetchAllVehicles(locale);
            if (!aborted) {
              const payload = JSON.stringify({ vehicles, ts: Date.now() });
              safeEnqueue(`data: ${payload}\n\n`);
            }
          } catch (e) {
            console.error("SSE fetch error:", e);
            safeEnqueue(`event: error\ndata: {"error":"fetch failed"}\n\n`);
          }
          // Small random jitter prevents thundering herd on upstream while
          // polling abort signal in small chunks for responsive cleanup
          const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
          const steps = Math.ceil(delay / ABORT_POLL_MS);
          for (let i = 0; i < steps && !aborted; i++) {
            await new Promise((r) => setTimeout(r, ABORT_POLL_MS));
          }
        }
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      };

      loop().catch((e) => {
        console.error("SSE loop crashed:", e);
        aborted = true;
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
