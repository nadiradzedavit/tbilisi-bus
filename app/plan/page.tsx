import JourneyPlanner from "@/components/JourneyPlanner";

export default function PlanPage() {
  return (
    <section className="mx-auto max-w-3xl py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Plan a trip
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Find the best route between any two stops.
        </p>
      </header>
      <JourneyPlanner locale="en" />
    </section>
  );
}
