import { cn } from "@/lib/utils";
import { sanitizeColor } from "@/lib/safe";

export default function RouteBadge({
  shortName,
  color,
  size = "md",
  className,
}: {
  shortName: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-7 min-w-7 px-1.5 text-2xs",
    md: "h-9 min-w-9 px-2 text-xs",
    lg: "h-12 min-w-12 px-3 text-sm",
  };
  const c = sanitizeColor(color);
  return (
    <span
      className={cn(
        "ring-focus inline-flex items-center justify-center rounded-md font-mono font-bold tracking-tight tabular",
        sizes[size],
        className,
      )}
      style={{
        background: `#${c}22`,
        color: `#${c}`,
        border: `1px solid #${c}55`,
        boxShadow: `0 0 12px -4px #${c}66`,
      }}
    >
      {shortName}
    </span>
  );
}
