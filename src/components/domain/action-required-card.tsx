import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActionRequiredView {
  title: string;
  campaignName: string | null;
  deliverableLabel: string | null;
  deadlineText: string | null;
  isOverdue: boolean;
  actionLabel: string;
  href: string;
}

interface ActionRequiredCardProps {
  view: ActionRequiredView;
  className?: string;
}

/**
 * F-DASH-01. The single most urgent open task, above the fold.
 *
 * The amber accent is reserved for exactly this: the one thing the creator
 * should do next. Spending it elsewhere is what makes dashboards unreadable.
 */
export function ActionRequiredCard({ view, className }: ActionRequiredCardProps) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border-2 p-4",
        view.isOverdue
          ? "border-status-danger-border bg-status-danger-bg"
          : "border-energy-border bg-energy-bg",
        className,
      )}
    >
      <p className="text-caption font-semibold tracking-wide uppercase text-energy">
        {view.isOverdue ? "Overdue" : "Do this next"}
      </p>

      <h2 className="mt-2 font-display text-h1 leading-tight text-balance">
        {view.title}
      </h2>

      {(view.campaignName ?? view.deliverableLabel) && (
        <p className="mt-1.5 text-sm text-muted-foreground">
          {[view.campaignName, view.deliverableLabel].filter(Boolean).join(" · ")}
        </p>
      )}

      {view.deadlineText && (
        <p
          className={cn(
            "mt-3 font-mono text-sm tabular",
            view.isOverdue ? "text-status-danger-fg" : "text-foreground",
          )}
        >
          {view.deadlineText}
        </p>
      )}

      <Button asChild size="lg" className="mt-4 w-full">
        <Link href={view.href}>
          {view.actionLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Button>
    </article>
  );
}
