import RouteCard from "@/components/RouteCard";
import { ttc } from "@/lib/ttc";
import type { Bus } from "@/lib/types";

export default async function RoutesPage() {
  let routes: Bus[] = [];
  try {
    routes = (await ttc.routes({ locale: "en" })) as Bus[];
  } catch (e) {
    console.error("routes load failed", e);
    routes = [];
  }
  return (
    <section className="mx-auto max-w-3xl py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Routes</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {routes.length} bus routes across the network.
        </p>
      </header>
      {routes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-fg-muted">
          Could not load routes.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {routes.map((r) => (
            <li key={r.id}>
              <RouteCard route={r} locale="en" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
