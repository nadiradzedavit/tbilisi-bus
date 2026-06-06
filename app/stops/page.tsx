import StopSearch from "@/components/StopSearch";

export default function StopsPage() {
  return (
    <section className="mx-auto max-w-3xl py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Stops</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Search across the TTC network. Live arrivals for every stop.
        </p>
      </header>
      <StopSearch locale="en" />
    </section>
  );
}
