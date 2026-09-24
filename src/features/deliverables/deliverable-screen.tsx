"use client";

import { ArrowLeft, ExternalLink, FileText, Video } from "lucide-react";
import Link from "next/link";

import { DraftCounter } from "@/components/domain/draft-counter";
import { GatingNotice } from "@/components/domain/gating-notice";
import { QuestTracker, type QuestCheckpoint } from "@/components/domain/quest-tracker";
import { SubmissionVersionTimeline } from "@/components/domain/version-timeline";
import { OwnershipBadge } from "@/components/patterns/ownership-badge";
import { SectionHeader } from "@/components/patterns/section";
import { SlaCountdown } from "@/components/patterns/sla-countdown";
import { CardSkeleton, ErrorState } from "@/components/patterns/states";
import { StatusPill } from "@/components/patterns/status-pill";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useQuery } from "@/lib/api/hooks";
import {
  canSubmit,
  DELIVERABLE_TYPE_LABEL,
  evaluateGate,
} from "@/lib/domain/deliverables";
import { currentStage } from "@/lib/domain/review";
import { slaView } from "@/lib/domain/sla";
import { deliverableStatus } from "@/lib/domain/status";
import type { DeliverableStatus } from "@/lib/types";
import { REVIEW_STAGE_HELP, REVIEW_STAGE_LABEL } from "@/lib/format/copy";
import { formatDateTime } from "@/lib/format/datetime";
import { toTimelineEntries } from "@/features/deliverables/mappers";

/**
 * Four checkpoints cover every deliverable status. `blocked`/`not_started`
 * both read as "not started yet"; `changes_requested` folds back into
 * "in production" so the rail never needs a fifth node for a loop back.
 */
const CHECKPOINT_RANK: Record<DeliverableStatus, number> = {
  not_started: 0,
  blocked: 0,
  in_production: 0,
  changes_requested: 0,
  submitted: 1,
  under_review: 1,
  approved: 2,
  live_link_submitted: 2,
  link_verified: 3,
  rejected: 1,
};

function questCheckpoints(status: DeliverableStatus): QuestCheckpoint[] {
  const rank = CHECKPOINT_RANK[status];
  const labels = ["Create your draft", "Submitted for review", "Approved", "Live and verified"];
  return labels.map((label, i) => ({
    id: label,
    label,
    state: i < rank ? "done" : i === rank ? "current" : "locked",
  }));
}

export function DeliverableScreen({ deliverableId }: { deliverableId: string }) {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.deliverables.get(deliverableId, { signal }),
    [deliverableId],
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
  if (isLoading || !data) return <CardSkeleton rows={4} />;

  const {
    deliverable,
    campaign,
    brand,
    versions,
    reviews,
    slaClocks,
    blocker,
    budget,
    brief,
  } = data;

  const gate = evaluateGate(deliverable, blocker);
  const eligibility = canSubmit(deliverable, versions, blocker);
  const latestVersion = versions.at(-1);
  const latestReviews = latestVersion
    ? reviews.filter((r) => r.submission_version_id === latestVersion.id)
    : [];
  const stage = currentStage(campaign, latestReviews);

  // Only the clock for the stage that currently owns the work is live.
  const activeClock =
    slaClocks
      .filter((c) => !c.paused_at && (stage === null || c.stage === stage))
      .at(-1) ?? null;

  const isVideo = deliverable.type === "video";
  const Icon = isVideo ? Video : FileText;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/campaigns/${campaign.id}`}>
          <ArrowLeft className="size-4" aria-hidden />
          {campaign.name}
        </Link>
      </Button>

      <header>
        <p className="text-sm text-muted-foreground">{brand.name}</p>
        <h1 className="mt-1 flex items-center gap-2 font-display text-h1">
          <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          {DELIVERABLE_TYPE_LABEL[deliverable.type]}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusPill status={deliverableStatus(deliverable.status)} />
          <OwnershipBadge
            owner={deliverable.current_owner_kind}
            since={deliverable.owner_since}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {activeClock && <SlaCountdown view={slaView(activeClock)} />}
          <span className="text-sm text-muted-foreground">
            Due {formatDateTime(deliverable.due_at)}
          </span>
        </div>
      </header>

      <section className="card-hard rounded-[var(--radius-lg)] bg-card p-4">
        <SectionHeader title="Your quest" className="mb-3" />
        <QuestTracker checkpoints={questCheckpoints(deliverable.status)} />
      </section>

      {/* Two-stage review is visible: the creator knows who has it now. */}
      {stage && (deliverable.status === "submitted" || deliverable.status === "under_review") && (
        <div className="rounded-lg border border-status-info-border bg-status-info-bg p-4">
          <p className="font-medium text-status-info-fg">{REVIEW_STAGE_LABEL[stage]}</p>
          <p className="mt-1 text-sm text-muted-foreground">{REVIEW_STAGE_HELP[stage]}</p>
        </div>
      )}

      {/* F-SUB-07: when locked, no upload control is rendered at all. */}
      {gate.blocked && gate.reason && <GatingNotice reason={gate.reason} />}

      {!gate.blocked && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DraftCounter budget={budget} />
          </div>

          {eligibility.canSubmit ? (
            <Button asChild size="lg" className="w-full">
              <Link href={`/deliverables/${deliverable.id}/submit`}>
                {versions.length === 0
                  ? `Write your ${deliverable.type}`
                  : `Submit draft ${budget.used + 1}`}
              </Link>
            </Button>
          ) : (
            eligibility.reason && (
              <p className="rounded-lg border border-dashed bg-surface-sunken p-4 text-sm text-muted-foreground">
                {eligibility.reason}
              </p>
            )
          )}
        </section>
      )}

      {deliverable.status === "approved" && (
        <div className="rounded-lg border border-status-success-border bg-status-success-bg p-4">
          <p className="font-medium text-status-success-fg">Approved</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isVideo
              ? "Your next step is publishing. Check your tasks for go-live instructions."
              : "Your video is now unlocked."}
          </p>
        </div>
      )}

      <section className="space-y-3">
        <SectionHeader
          title="Requirements"
          description="From the campaign brief"
        />
        <div className="rounded-lg border bg-card p-4">
          {deliverable.requirements ? (
            <p className="text-sm">{deliverable.requirements}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{brief.content.summary}</p>
          )}
          <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2">
            <Link href={`/campaigns/${campaign.id}`}>
              Read the full brief
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      {versions.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            title="History"
            description="Every draft and decision, kept in full"
          />
          <SubmissionVersionTimeline
            entries={toTimelineEntries(versions, reviews)}
          />
        </section>
      )}
    </div>
  );
}
