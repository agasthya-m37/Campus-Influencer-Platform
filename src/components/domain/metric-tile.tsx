import { CheckCircle2, CircleUser, Database, Zap } from "lucide-react";
import type { ComponentType } from "react";

import { METRIC_SOURCE_HELP, METRIC_SOURCE_LABEL } from "@/lib/format/copy";
import { formatNumber } from "@/lib/format/currency";
import { formatRelative } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";
import type { MetricSource } from "@/lib/types";

const SOURCE_ICON: Record<MetricSource, ComponentType<{ className?: string }>> = {
  api: Zap,
  creator_submitted: CircleUser,
  admin_verified: CheckCircle2,
  manual_import: Database,
};

/** Only API and admin-verified read as authoritative. */
const SOURCE_CLASS: Record<MetricSource, string> = {
  api: "bg-status-success-bg text-status-success-fg border-status-success-border",
  admin_verified:
    "bg-status-success-bg text-status-success-fg border-status-success-border",
  creator_submitted:
    "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
  manual_import:
    "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
};

interface MetricTileProps {
  label: string;
  value: number;
  /**
   * F-REP-06 — required, not optional. An unlabelled rate is a defect, so
   * this is enforced as a type error rather than a review comment. For a
   * count rather than a rate, say what is being counted.
   */
  denominator: string;
  /** F-REP-08 — required. Manual data must never look API-verified. */
  source: MetricSource;
  lastUpdatedAt: string;
  /** Renders as a percentage with its denominator spelled out. */
  isRate?: boolean;
  className?: string;
}

export function MetricTile({
  label,
  value,
  denominator,
  source,
  lastUpdatedAt,
  isRate = false,
  className,
}: MetricTileProps) {
  const Icon = SOURCE_ICON[source];

  return (
    <div className={cn("flex flex-col rounded-lg border bg-card p-4", className)}>
      <p className="text-caption text-muted-foreground">{label}</p>

      <p className="mt-1 font-display text-h1 tabular">
        {isRate ? `${value.toFixed(2)}%` : formatNumber(value)}
      </p>

      {/* The denominator always travels with the number. */}
      <p className="mt-0.5 mb-3 text-caption text-muted-foreground">{denominator}</p>

      {/* mt-auto pins the provenance row to the bottom, so tiles sitting in
          the same grid row align on their footers regardless of label length. */}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium",
            SOURCE_CLASS[source],
          )}
          title={METRIC_SOURCE_HELP[source]}
        >
          <Icon className="size-3" aria-hidden />
          {METRIC_SOURCE_LABEL[source]}
        </span>
        <span className="text-caption text-muted-foreground">
          {formatRelative(lastUpdatedAt)}
        </span>
      </div>
    </div>
  );
}
