import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Urgency } from "@/lib/domain/tasks";

export interface TaskCardView {
  id: string;
  title: string;
  context: string | null;
  deadlineText: string | null;
  urgency: Urgency;
  actionLabel: string;
  href: string;
}

const RULE: Record<Urgency, string> = {
  overdue: "bg-status-danger-fg",
  due_soon: "bg-energy",
  later: "bg-status-info-fg",
  no_deadline: "bg-border",
};

export function TaskCard({ view, className }: { view: TaskCardView; className?: string }) {
  return (
    <Link
      href={view.href}
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-lg border bg-card p-4 pl-5 transition-colors hover:border-primary/40",
        className,
      )}
    >
      {/* Urgency is carried by a rule and by text, never by colour alone. */}
      <span
        className={cn("absolute inset-y-0 left-0 w-1.5", RULE[view.urgency])}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{view.title}</p>
        {view.context && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{view.context}</p>
        )}
        {view.deadlineText && (
          <p
            className={cn(
              "mt-1.5 font-mono text-caption tabular",
              view.urgency === "overdue"
                ? "text-status-danger-fg"
                : view.urgency === "due_soon"
                  ? "text-energy"
                  : "text-muted-foreground",
            )}
          >
            {view.deadlineText}
          </p>
        )}
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
        <span className="hidden sm:inline">{view.actionLabel}</span>
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
