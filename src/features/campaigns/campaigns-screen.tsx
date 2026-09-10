"use client";

import { Megaphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { PageHeader } from "@/components/patterns/section";
import { StatusPill } from "@/components/patterns/status-pill";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type CampaignListItem } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useQuery } from "@/lib/api/hooks";
import { isTerminal, isWorking } from "@/lib/domain/participation";
import { participationStatus } from "@/lib/domain/status";
import { formatMoney } from "@/lib/format/currency";
import { formatRelativeDeadline } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";

type Filter = "active" | "invitations" | "past";

const PENDING: Array<CampaignListItem["assignment"]["participation_status"]> = [
  "invited",
  "applied",
  "shortlisted",
  "selected",
  "assigned",
];

export function CampaignsScreen() {
  const [filter, setFilter] = useState<Filter>("active");
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.campaigns.list({ signal }),
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

  const all = data?.items ?? [];
  const counts = {
    active: all.filter((c) => isWorking(c.assignment.participation_status)).length,
    invitations: all.filter((c) => PENDING.includes(c.assignment.participation_status))
      .length,
    past: all.filter((c) => isTerminal(c.assignment.participation_status)).length,
  };

  const visible = all.filter((c) => {
    const status = c.assignment.participation_status;
    if (filter === "active") return isWorking(status);
    if (filter === "invitations") return PENDING.includes(status);
    return isTerminal(status);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Campaigns" />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">
            Active {counts.active > 0 && `(${counts.active})`}
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex-1">
            Invites {counts.invitations > 0 && `(${counts.invitations})`}
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1">
            Past {counts.past > 0 && `(${counts.past})`}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="size-6" />}
          title={
            filter === "invitations"
              ? "No invitations right now"
              : filter === "active"
                ? "No active campaigns"
                : "Nothing here yet"
          }
          description={
            filter === "invitations"
              ? "Puzzle Media invites you when a brand matches your profile."
              : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((row) => (
            <li key={row.assignment.id}>
              <CampaignRow row={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CampaignRow({ row }: { row: CampaignListItem }) {
  const { assignment, campaign, brand, deliverables } = row;
  const isInvite = assignment.participation_status === "invited";
  const deadline = assignment.accept_by
    ? formatRelativeDeadline(assignment.accept_by)
    : null;

  const nextDue = deliverables
    .filter((d) => d.status !== "approved" && d.status !== "link_verified")
    .sort((a, b) => a.due_at.localeCompare(b.due_at))[0];

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className={cn(
        "block rounded-lg border bg-card p-4 transition-colors hover:border-primary/40",
        isInvite && "border-energy-border bg-energy-bg/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{campaign.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{brand.name}</p>
        </div>
        <StatusPill
          size="sm"
          status={participationStatus(assignment.participation_status)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        {/* Fee is shown only when the assignment permits it. When it does
            not, the value is absent from the DOM, not merely hidden. */}
        {assignment.visible_to_creator && assignment.fee_amount !== null && (
          <span className="font-medium tabular">{formatMoney(assignment.fee_amount)}</span>
        )}
        {isInvite && deadline && (
          <span
            className={cn(
              "font-mono text-caption tabular",
              deadline.isOverdue ? "text-status-danger-fg" : "text-energy",
            )}
          >
            Respond in {deadline.text.replace(" left", "")}
          </span>
        )}
        {!isInvite && nextDue && (
          <span className="font-mono text-caption tabular text-muted-foreground">
            {nextDue.type === "script" ? "Script" : nextDue.type === "video" ? "Video" : "Post"}{" "}
            {formatRelativeDeadline(nextDue.due_at).text.toLowerCase()}
          </span>
        )}
      </div>
    </Link>
  );
}
