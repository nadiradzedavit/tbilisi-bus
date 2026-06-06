import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

export function ArrivalSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-card/50 p-3">
      <Skeleton className="h-10 w-10 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2 w-1/3" />
      </div>
      <Skeleton className="h-6 w-12" />
    </div>
  );
}
