import { Check, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

export interface QuestCheckpoint {
  id: string;
  label: string;
  state: "done" | "current" | "locked";
}

interface QuestTrackerProps {
  checkpoints: QuestCheckpoint[];
  className?: string;
}

/**
 * A checkpoint/quest-style progress rail. Built on the same "state per step"
 * shape as `Stepper`/`StepperRail` in patterns/stepper.tsx, but reads as a
 * quest line — filled lime nodes for cleared checkpoints, an orange pulse-
 * free ring for the current one, a lock icon for what's still ahead — rather
 * than a plain numbered list.
 *
 * State is never colour alone: each node also carries an icon (check / lock
 * / number) and the label sits beside it in text.
 */
export function QuestTracker({ checkpoints, className }: QuestTrackerProps) {
  return (
    <ol className={cn("space-y-0", className)} aria-label="Progress">
      {checkpoints.map((checkpoint, index) => {
        const isLast = index === checkpoints.length - 1;
        return (
          <li key={checkpoint.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink text-[11px] font-bold tabular",
                  checkpoint.state === "done" &&
                    "bg-[var(--pm-lime-500)] text-ink",
                  checkpoint.state === "current" &&
                    "bg-primary text-primary-foreground",
                  checkpoint.state === "locked" &&
                    "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {checkpoint.state === "done" ? (
                  <Check className="size-3.5" />
                ) : checkpoint.state === "locked" ? (
                  <Lock className="size-3" />
                ) : (
                  index + 1
                )}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    "my-0.5 w-0.5 flex-1 rounded-full",
                    checkpoint.state === "done" ? "bg-[var(--pm-lime-500)]" : "bg-border",
                  )}
                  style={{ minHeight: "1.25rem" }}
                  aria-hidden
                />
              )}
            </div>
            <div className={cn("pb-4", isLast && "pb-0")}>
              <p
                className={cn(
                  "pt-0.5 text-sm font-medium",
                  checkpoint.state === "locked" && "text-muted-foreground",
                )}
              >
                {checkpoint.label}
              </p>
              <p className="text-caption text-muted-foreground">
                {checkpoint.state === "done"
                  ? "Cleared"
                  : checkpoint.state === "current"
                    ? "In progress"
                    : "Locked"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
