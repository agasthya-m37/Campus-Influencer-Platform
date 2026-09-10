"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { OwnershipBadge } from "@/components/patterns/ownership-badge";
import { PageHeader } from "@/components/patterns/section";
import { SlaCountdown } from "@/components/patterns/sla-countdown";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { StatusPill } from "@/components/patterns/status-pill";
import { Badge } from "@/components/ui/badge";
import { api, type ReviewQueueItem } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useQuery } from "@/lib/api/hooks";
import { DELIVERABLE_TYPE_LABEL } from "@/lib/domain/deliverables";
import { slaSortKey, slaView } from "@/lib/domain/sla";
import { deliverableStatus } from "@/lib/domain/status";
import { REVIEW_STAGE_LABEL } from "@/lib/format/copy";
import { formatCompact } from "@/lib/format/currency";

/** F-REV-01. Grouped, and sorted by SLA remaining ascending by default. */
export function ReviewQueueScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.reviewer.queue({ signal }),
    [],
  );

  if (error) {
    return (
      <ErrorState
        message={messageFor(error)}
        isOffline={error.kind === "network"}
        onRetry={refetch}
      />
    );
  }

  const items = [...(data?.items ?? [])].sort(
    (a, b) => slaSortKey(a.slaClock) - slaSortKey(b.slaClock),
  );

  const groups = [
    {
      key: "overdue",
      title: "Overdue",
      items: items.filter((i) => i.slaClock && slaView(i.slaClock).isOverdue),
    },
    {
      key: "resubmitted",
      title: "Resubmitted",
      items: items.filter(
        (i) =>
          i.version.version_no > 1 &&
          !(i.slaClock && slaView(i.slaClock).isOverdue),
      ),
    },
    {
      key: "new",
      title: "Waiting on you",
      items: items.filter(
        (i) =>
          i.version.version_no === 1 &&
          !(i.slaClock && slaView(i.slaClock).isOverdue),
      ),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        description={
          data
            ? `${REVIEW_STAGE_LABEL[data.stage]} · ${items.length} waiting`
            : undefined
        }
      />

      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-6" />}
          title="Nothing waiting on you"
          description={
            data?.stage === "brand"
              ? "Work appears here after Puzzle Media has checked it."
              : "New submissions land here as creators send them."
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <h2 className="font-display text-h2">
                {group.title}
                <span className="ml-2 font-sans text-sm font-normal text-muted-foreground tabular">
                  {group.items.length}
                </span>
              </h2>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.version.id}>
                    <QueueRow item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function QueueRow({ item }: { item: ReviewQueueItem }) {
  return (
    <Link
      href={`/reviewer/submissions/${item.version.id}`}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{item.creator.display_name}</p>
          <Badge variant="secondary" className="font-mono text-caption tabular">
            v{item.version.version_no}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {DELIVERABLE_TYPE_LABEL[item.deliverable.type]}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {item.campaign.name} · {item.brand.name}
        </p>
        <p className="mt-0.5 text-caption text-muted-foreground">
          {item.creator.college_id === "clg_vit" ? "VIT Vellore" : "Campus creator"}
          {" · "}
          {formatCompact(24300)} followers
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <StatusPill size="sm" status={deliverableStatus(item.deliverable.status)} />
        {item.slaClock ? (
          <SlaCountdown view={slaView(item.slaClock)} showLabel={false} />
        ) : (
          <OwnershipBadge
            owner={item.deliverable.current_owner_kind}
            since={item.deliverable.owner_since}
          />
        )}
      </div>
    </Link>
  );
}
