import { ArrowRight } from "lucide-react";

import { OWNER_LABEL } from "@/lib/format/copy";
import { formatRelative } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";
import type { OwnerKind } from "@/lib/types";

interface OwnershipBadgeProps {
  owner: OwnerKind;
  since: string;
  className?: string;
}

/**
 * Answers "who is blocking this, and since when" — the question the PRD
 * says the status model is wrong if it cannot answer.
 */
export function OwnershipBadge({ owner, since, className }: OwnershipBadgeProps) {
  const isYou = owner === "creator";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <ArrowRight className="size-3.5 shrink-0" aria-hidden />
      <span>
        With{" "}
        <span className={cn("font-medium", isYou ? "text-energy" : "text-foreground")}>
          {OWNER_LABEL[owner]}
        </span>{" "}
        {formatRelative(since)}
      </span>
    </span>
  );
}
