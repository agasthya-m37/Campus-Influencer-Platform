import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

interface StreakIndicatorProps {
  days: number;
  /** "sm" fits a top-bar/nav glimpse; "md" fits a card header. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Flame + day count. Orange accent (the brand's energy colour), never
 * colour-only — the count and the word "day streak" always ride along.
 */
export function StreakIndicator({ days, size = "md", className }: StreakIndicatorProps) {
  const hasStreak = days > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-[1.5px] border-ink font-semibold tabular",
        size === "sm" ? "px-2 py-0.5 text-caption" : "px-2.5 py-1 text-sm",
        // status-warn's orange-100/orange-800 pairing (5.77:1) rather than
        // the lighter brand-energy-bg/energy pair (4.37:1, under AA at this
        // small, non-bold-large caption size).
        hasStreak
          ? "bg-status-warn-bg text-status-warn-fg"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Flame
        className={size === "sm" ? "size-3" : "size-3.5"}
        aria-hidden
        fill={hasStreak ? "currentColor" : "none"}
      />
      {days} day{days === 1 ? "" : "s"}
    </span>
  );
}
