import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface StepperProps {
  steps: Array<{ id: string; title: string }>;
  currentIndex: number;
  completedIndices: number[];
  className?: string;
}

/**
 * At 360px a labelled step list does not fit, so mobile gets dots plus a
 * count and the current title. Desktop gets the full rail.
 */
export function Stepper({
  steps,
  currentIndex,
  completedIndices,
  className,
}: StepperProps) {
  const current = steps[currentIndex];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-sm tabular text-muted-foreground">
          Step {currentIndex + 1} of {steps.length}
        </p>
        <p className="text-sm font-medium">{current?.title}</p>
      </div>

      <ol className="flex gap-1.5" aria-label="Progress">
        {steps.map((step, index) => {
          const done = completedIndices.includes(index);
          const active = index === currentIndex;
          return (
            <li
              key={step.id}
              className="flex-1"
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-colors",
                  done || active ? "bg-primary" : "bg-border",
                )}
              />
              <span className="sr-only">
                {step.title}
                {done ? " (completed)" : active ? " (current)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Desktop variant with visible labels. */
export function StepperRail({
  steps,
  currentIndex,
  completedIndices,
}: StepperProps) {
  return (
    <ol className="space-y-1">
      {steps.map((step, index) => {
        const done = completedIndices.includes(index);
        const active = index === currentIndex;
        return (
          <li key={step.id}>
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary text-primary"
                      : "border-border",
                )}
                aria-hidden
              >
                {done ? <Check className="size-3" /> : index + 1}
              </span>
              {step.title}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
