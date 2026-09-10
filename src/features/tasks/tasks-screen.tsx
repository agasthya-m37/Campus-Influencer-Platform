"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { TaskCard } from "@/components/domain/task-card";
import { PageHeader } from "@/components/patterns/section";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useQuery } from "@/lib/api/hooks";
import { openTasks, sortByUrgency, urgencyOf } from "@/lib/domain/tasks";
import { toTaskCardView } from "@/features/dashboard/mappers";

type Filter = "open" | "overdue" | "done";

/**
 * The task queue. F-DASH-01's action card reads the top of this same list,
 * so the two can never disagree about what is most urgent.
 */
export function TasksScreen() {
  const [filter, setFilter] = useState<Filter>("open");
  const tasksQuery = useQuery((signal) => api.tasks.list({ signal }), []);
  const campaignsQuery = useQuery((signal) => api.campaigns.list({ signal }), []);

  if (tasksQuery.error) {
    return (
      <ErrorState
        message={messageFor(tasksQuery.error)}
        isOffline={tasksQuery.error.kind === "network"}
        onRetry={tasksQuery.refetch}
      />
    );
  }

  const all = tasksQuery.data ?? [];
  const campaignById = new Map(
    (campaignsQuery.data?.items ?? []).map((c) => [c.campaign.id, c.campaign]),
  );

  const open = sortByUrgency(openTasks(all));
  const overdue = open.filter((t) => urgencyOf(t) === "overdue");
  const done = all.filter((t) => t.status !== "open");

  const visible = filter === "open" ? open : filter === "overdue" ? overdue : done;

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="w-full">
          <TabsTrigger value="open" className="flex-1">
            Open {open.length > 0 && `(${open.length})`}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex-1">
            Overdue {overdue.length > 0 && `(${overdue.length})`}
          </TabsTrigger>
          <TabsTrigger value="done" className="flex-1">
            Done
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tasksQuery.isLoading ? (
        <CardSkeleton rows={3} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-6" />}
          title={
            filter === "overdue"
              ? "Nothing is overdue"
              : filter === "done"
                ? "Nothing finished yet"
                : "You are all caught up"
          }
          description={
            filter === "open"
              ? "New tasks appear when a reviewer responds or a campaign starts."
              : undefined
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => (
            <li key={task.id}>
              {task.status === "open" ? (
                <TaskCard
                  view={toTaskCardView(task, campaignById.get(task.campaign_id ?? ""))}
                />
              ) : (
                <div className="rounded-lg border bg-card p-4 opacity-70">
                  <p className="font-medium line-through decoration-muted-foreground/50">
                    {task.action_required}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {task.closed_reason ?? "Closed"}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
