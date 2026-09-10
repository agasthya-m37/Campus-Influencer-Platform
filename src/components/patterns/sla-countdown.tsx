"use client";

import { AlertTriangle, Clock, PauseCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { SlaView } from "@/lib/domain/sla";

interface SlaCountdownProps {
  /** Precomputed view, so this component stays pure and testable. */
  view: SlaView;
  /** Re-render on an interval to keep the countdown live. */
  live?: boolean;
  showLabel?: boolean;
  className?: string;
}

/**
 * Mono and tabular: a ticking countdown in a proportional font jitters as
 * digit widths change, which reads as the page being broken.
 */
export function SlaCountdown({
  view,
  live = true,
  showLabel = true,
  className,
}: SlaCountdownProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!live || view.state === "paused") return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [live, view.state]);

  const Icon =
    view.state === "paused" ? PauseCircle : view.isOverdue ? AlertTriangle : Clock;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-sm tabular",
        view.isOverdue
          ? "text-status-danger-fg"
          : view.approachingBreach
            ? "text-status-warn-fg"
            : "text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span>{view.remainingText}</span>
      {showLabel && view.approachingBreach && !view.isOverdue && (
        <span className="font-sans text-caption">Due soon</span>
      )}
    </span>
  );
}
