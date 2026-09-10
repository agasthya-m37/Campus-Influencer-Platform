/**
 * Task rules (F-TASK-01..05).
 *
 * Tasks are a first-class object, not a filtered view of deliverables. The
 * dashboard's action-required card (F-DASH-01) calls `topActionRequired`
 * here — it is the same queue `/tasks` renders, not a parallel calculation.
 */

import type { Task, TaskType } from "@/lib/types";

export type Urgency = "overdue" | "due_soon" | "later" | "no_deadline";

/** Anything inside this window counts as "due soon". */
export const DUE_SOON_HOURS = 24;

export function urgencyOf(task: Task, now: Date = new Date()): Urgency {
  if (!task.due_at) return "no_deadline";
  const diffMs = new Date(task.due_at).getTime() - now.getTime();
  if (diffMs < 0) return "overdue";
  if (diffMs <= DUE_SOON_HOURS * 3_600_000) return "due_soon";
  return "later";
}

const URGENCY_RANK: Record<Urgency, number> = {
  overdue: 0,
  due_soon: 1,
  later: 2,
  no_deadline: 3,
};

/**
 * F-TASK-02. Overdue first, then due soon, then later. Ties break on the
 * earlier deadline so the ordering is total and stable.
 */
export function sortByUrgency(tasks: Task[], now: Date = new Date()): Task[] {
  return [...tasks].sort((a, b) => {
    const rank = URGENCY_RANK[urgencyOf(a, now)] - URGENCY_RANK[urgencyOf(b, now)];
    if (rank !== 0) return rank;

    if (a.due_at && b.due_at) {
      const byDue = new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      if (byDue !== 0) return byDue;
    } else if (a.due_at) {
      return -1;
    } else if (b.due_at) {
      return 1;
    }

    // Final tiebreak keeps ordering deterministic across renders.
    return a.created_at.localeCompare(b.created_at);
  });
}

export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === "open");
}

/**
 * F-DASH-01. The single most urgent open task the creator owns. The
 * dashboard card renders exactly this, so the card and the queue can never
 * disagree about what is most urgent.
 */
export function topActionRequired(
  tasks: Task[],
  now: Date = new Date(),
): Task | null {
  return sortByUrgency(openTasks(tasks), now)[0] ?? null;
}

export function countOverdue(tasks: Task[], now: Date = new Date()): number {
  return openTasks(tasks).filter((t) => urgencyOf(t, now) === "overdue").length;
}

/** Tasks with no deliverable behind them (F-TASK-05). */
export function isNonCampaignTask(task: Task): boolean {
  return task.deliverable_id === null && task.campaign_id === null;
}

export const TASK_LABEL: Record<TaskType, string> = {
  submit_script: "Submit your script",
  revise_script: "Revise your script",
  submit_video: "Submit your video",
  revise_video: "Revise your video",
  accept_invitation: "Respond to invitation",
  publish_post: "Publish your post",
  submit_live_link: "Add your live link",
  submit_metrics: "Add your results",
  complete_profile: "Finish your profile",
  confirm_event: "Confirm your spot",
  review_submission: "Review submission",
};

/** The verb on the task's primary button. Short, because it sits on a chip. */
export const TASK_ACTION_LABEL: Record<TaskType, string> = {
  submit_script: "Write script",
  revise_script: "Revise",
  submit_video: "Upload video",
  revise_video: "Re-upload",
  accept_invitation: "View brief",
  publish_post: "See instructions",
  submit_live_link: "Add link",
  submit_metrics: "Add results",
  complete_profile: "Continue",
  confirm_event: "Confirm",
  review_submission: "Review",
};
