/**
 * SLA clock behaviour (F-SLA-02, F-SLA-03, F-SLA-05).
 *
 * The clock starts on a *valid* submission — one that passed file validation
 * and malware scanning. A quarantined file does not start the clock. On
 * changes requested the clock stops; a resubmission opens a new window for
 * the new version rather than resuming the old one.
 */

import type { ReviewStage, ScanStatus, SlaClock } from "@/lib/types";
import { durationBetween, formatCountdown, type Iso } from "@/lib/format/datetime";

/** F-SLA-01 defaults, overridable per campaign. */
export const SLA_DEFAULT_HOURS = {
  script: 48,
  video: 72,
  live_post: 24,
} as const;

/** F-SLA-02: a quarantined file does not start the clock. */
export function startsClock(scan: ScanStatus): boolean {
  return scan === "clean" || scan === "skipped";
}

export type SlaState = "running" | "paused" | "breached" | "met";

export interface SlaView {
  state: SlaState;
  /** Fraction of the window consumed, clamped to [0, 1]. */
  progress: number;
  remainingText: string;
  isOverdue: boolean;
  /** F-REV-06: under 25% remaining counts as approaching breach. */
  approachingBreach: boolean;
  dueAt: Iso;
  stage: ReviewStage;
}

export function slaView(clock: SlaClock, now: Date = new Date()): SlaView {
  const start = new Date(clock.started_at).getTime();
  const due = new Date(clock.due_at).getTime();
  const window = Math.max(1, due - start);

  if (clock.paused_at) {
    const consumed = new Date(clock.paused_at).getTime() - start;
    return {
      state: "paused",
      progress: Math.min(1, Math.max(0, consumed / window)),
      remainingText: "Paused",
      isOverdue: false,
      approachingBreach: false,
      dueAt: clock.due_at,
      stage: clock.stage,
    };
  }

  const elapsed = now.getTime() - start;
  const progress = Math.min(1, Math.max(0, elapsed / window));
  const d = durationBetween(now, clock.due_at);
  const overdue = d.isPast;
  const remainingFraction = 1 - progress;

  return {
    state: overdue ? "breached" : "running",
    progress,
    remainingText: overdue
      ? `Overdue by ${formatCountdown(d)}`
      : `${formatCountdown(d)} left`,
    isOverdue: overdue,
    approachingBreach: !overdue && remainingFraction < 0.25,
    dueAt: clock.due_at,
    stage: clock.stage,
  };
}

/** Sort key for the reviewer queue: least time remaining first. */
export function slaSortKey(clock: SlaClock | null): number {
  return clock ? new Date(clock.due_at).getTime() : Number.MAX_SAFE_INTEGER;
}
