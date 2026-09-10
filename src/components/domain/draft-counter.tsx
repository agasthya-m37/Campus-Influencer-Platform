import { cn } from "@/lib/utils";
import type { DraftBudget } from "@/lib/domain/deliverables";

/**
 * F-SUB-12. Round count is visible to both sides, so nobody is surprised
 * when the last draft is spent.
 */
export function DraftCounter({
  budget,
  className,
}: {
  budget: DraftBudget;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: budget.limit }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-5 rounded-full",
              i < budget.used ? "bg-foreground" : "bg-border",
            )}
          />
        ))}
      </span>
      <span
        className={cn(
          "font-mono text-sm tabular",
          budget.exhausted ? "text-status-danger-fg" : "text-muted-foreground",
        )}
      >
        {budget.used} of {budget.limit} drafts
      </span>
      {budget.extended && (
        <span className="text-caption text-muted-foreground">(extra round granted)</span>
      )}
    </span>
  );
}
