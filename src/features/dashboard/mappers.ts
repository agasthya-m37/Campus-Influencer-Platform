/**
 * View-model mappers.
 *
 * Containers map entities to view models before handing them to components,
 * so a schema rename touches one file here and zero components. This is also
 * where display copy is decided, keeping components free of business vocabulary.
 */

import type { ActionRequiredView } from "@/components/domain/action-required-card";
import type { TaskCardView } from "@/components/domain/task-card";
import { TASK_ACTION_LABEL, urgencyOf } from "@/lib/domain/tasks";
import { formatRelativeDeadline } from "@/lib/format/datetime";
import type { Campaign, Task } from "@/lib/types";

const TYPE_LABEL: Partial<Record<Task["type"], string>> = {
  submit_script: "Script",
  revise_script: "Script",
  submit_video: "Video",
  revise_video: "Video",
  submit_live_link: "Live post",
  publish_post: "Live post",
  submit_metrics: "Results",
};

export function toActionRequiredView(
  task: Task,
  campaign: Campaign | undefined,
  now: Date = new Date(),
): ActionRequiredView {
  const deadline = task.due_at ? formatRelativeDeadline(task.due_at, now) : null;

  return {
    title: task.action_required,
    campaignName: campaign?.name ?? null,
    deliverableLabel: TYPE_LABEL[task.type] ?? null,
    deadlineText: deadline?.text ?? null,
    isOverdue: deadline?.isOverdue ?? false,
    actionLabel: TASK_ACTION_LABEL[task.type],
    href: task.deep_link,
  };
}

export function toTaskCardView(
  task: Task,
  campaign: Campaign | undefined,
  now: Date = new Date(),
): TaskCardView {
  const deadline = task.due_at ? formatRelativeDeadline(task.due_at, now) : null;

  return {
    id: task.id,
    title: task.action_required,
    context: campaign?.name ?? null,
    deadlineText: deadline?.text ?? null,
    urgency: urgencyOf(task, now),
    actionLabel: TASK_ACTION_LABEL[task.type],
    href: task.deep_link,
  };
}
