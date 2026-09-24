"use client";

import { BarChart3, ExternalLink, Trophy, Zap } from "lucide-react";
import { useState } from "react";

import { MetricTile } from "@/components/domain/metric-tile";
import { PageHeader, SectionHeader } from "@/components/patterns/section";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { Progress } from "@/components/ui/progress";
import { api, type PerformanceRow } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useQuery } from "@/lib/api/hooks";
import { performanceTier, type PerformanceTier } from "@/lib/domain/gamification";
import { METRICS_PENDING_EXPLAINER, METRICS_WINDOW_DAYS } from "@/lib/format/copy";
import { addDays, durationBetween, formatCountdown, formatDate } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";
import type { MetricSnapshot } from "@/lib/types";

const TIER_CLASS: Record<PerformanceTier, string> = {
  bronze: "bg-[var(--pm-orange-100)] text-[var(--pm-orange-800)] border-[var(--pm-orange-200)]",
  silver: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
  gold: "bg-[var(--pm-lime-200)] text-ink border-ink",
};

export function PerformanceScreen() {
  // Sampled once per mount so every tile on the page agrees on "now".
  const [now] = useState(() => new Date());
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.performance.list({ signal }),
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

  const rows = data?.items ?? [];

  // Personal bests, computed across every post this creator has live results
  // for — the same numbers each PostPerformance card already reads, just
  // reduced to a max so a stand-out post can be called out.
  const bestEngagementRate = rows.reduce((best, row) => {
    const rate = engagementRateOf(row);
    return rate !== null ? Math.max(best, rate) : best;
  }, 0);
  const bestReach = rows.reduce((best, row) => {
    const reach = row.snapshots.find((s) => s.metric_type === "reach");
    return reach ? Math.max(best, reach.value) : best;
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My impact"
        description="How your posts performed, and where each number came from."
      />

      {isLoading ? (
        <CardSkeleton rows={2} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="size-6" />}
          title="Nothing published yet"
          description="Once a post goes live, its results show up here."
        />
      ) : (
        <div className="space-y-8">
          {rows.map((row) => (
            <PostPerformance
              key={row.livePost.id}
              row={row}
              now={now}
              isBestEngagement={
                bestEngagementRate > 0 && engagementRateOf(row) === bestEngagementRate
              }
              isBestReach={
                bestReach > 0 &&
                row.snapshots.find((s) => s.metric_type === "reach")?.value === bestReach
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function engagementRateOf(row: PerformanceRow): number | null {
  const engagements = row.snapshots.find((s) => s.metric_type === "engagements");
  const reach = row.snapshots.find((s) => s.metric_type === "reach");
  if (!engagements || !reach || reach.value === 0) return null;
  return (engagements.value / reach.value) * 100;
}

function PostPerformance({
  row,
  now,
  isBestEngagement,
  isBestReach,
}: {
  row: PerformanceRow;
  now: Date;
  isBestEngagement: boolean;
  isBestReach: boolean;
}) {
  const { livePost, campaign, brand, snapshots } = row;

  const settlesAt = addDays(livePost.published_at, METRICS_WINDOW_DAYS);
  const untilSettled = durationBetween(now, settlesAt);
  const isSettled = untilSettled.isPast;

  // D13: the 7-day figure is what reporting uses. Before it exists, the
  // 24-hour snapshot is shown but never presented as final.
  const final = snapshots.filter((s) => s.window === "7d");
  const early = snapshots.filter((s) => s.window === "24h");
  const showing = final.length > 0 ? final : early;
  const isEarly = final.length === 0 && early.length > 0;

  const byType = new Map(showing.map((s) => [s.metric_type, s]));
  const reach = byType.get("reach");
  const impressions = byType.get("impressions");
  const engagements = byType.get("engagements");
  const views = byType.get("views");

  const elapsedFraction = isSettled
    ? 1
    : Math.max(
        0,
        Math.min(
          1,
          (now.getTime() - new Date(livePost.published_at).getTime()) /
            (METRICS_WINDOW_DAYS * 86_400_000),
        ),
      );

  const rate = engagementRateOf(row);
  const tier = rate !== null ? performanceTier(rate) : null;

  return (
    <section className="space-y-3">
      <SectionHeader
        title={campaign.name}
        description={`${brand.name} · published ${formatDate(livePost.published_at)}`}
        action={
          <a
            href={livePost.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary underline"
          >
            View post
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        }
      />

      {(tier || isBestEngagement || isBestReach) && (
        <div className="flex flex-wrap items-center gap-2">
          {tier && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-1 text-sm font-semibold",
                TIER_CLASS[tier.tier],
              )}
            >
              <Zap className="size-3.5" aria-hidden />
              {tier.label}
            </span>
          )}
          {isBestEngagement && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-[var(--pm-lime-500)] px-2.5 py-1 text-sm font-semibold text-ink">
              <Trophy className="size-3.5" aria-hidden />
              Personal best · engagement rate
            </span>
          )}
          {isBestReach && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-[var(--pm-lime-500)] px-2.5 py-1 text-sm font-semibold text-ink">
              <Trophy className="size-3.5" aria-hidden />
              Personal best · reach
            </span>
          )}
        </div>
      )}

      {/* The countdown, so a screen with no final numbers never reads as broken. */}
      {!isSettled && (
        <div className="card-hard rounded-[var(--radius-lg)] border-[var(--brand-energy-border)] bg-[var(--brand-energy-bg)] p-4">
          <div className="flex items-baseline justify-between gap-3">
            {/* Icon carries the energy colour; the label itself stays on
                foreground ink so the text keeps full AA contrast. */}
            <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <Zap className="size-4 text-[var(--brand-energy)]" aria-hidden />
              Final results in {formatCountdown(untilSettled)}
            </p>
            <p className="font-mono text-caption tabular text-muted-foreground">
              day {Math.min(METRICS_WINDOW_DAYS, Math.ceil(elapsedFraction * METRICS_WINDOW_DAYS))} of{" "}
              {METRICS_WINDOW_DAYS}
            </p>
          </div>
          <Progress
            value={elapsedFraction * 100}
            className="mt-3 h-1.5 [&>[data-slot=progress-indicator]]:bg-[var(--brand-energy)]"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            {METRICS_PENDING_EXPLAINER}
          </p>
        </div>
      )}

      {showing.length === 0 ? (
        <EmptyState
          title="No numbers yet"
          description={`We read your results ${METRICS_WINDOW_DAYS} days after you post.`}
        />
      ) : (
        <>
          {isEarly && (
            <p className="text-sm text-muted-foreground">
              Showing 24-hour numbers. These are early and will change.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {reach && (
              <MetricTile
                label="Reach"
                value={reach.value}
                denominator="unique accounts that saw it"
                source={reach.source}
                lastUpdatedAt={reach.captured_at}
              />
            )}
            {impressions && (
              <MetricTile
                label="Impressions"
                value={impressions.value}
                denominator="total times it was shown"
                source={impressions.source}
                lastUpdatedAt={impressions.captured_at}
              />
            )}
            {views && (
              <MetricTile
                label="Views"
                value={views.value}
                denominator="plays of at least 3 seconds"
                source={views.source}
                lastUpdatedAt={views.captured_at}
              />
            )}
            {engagements && (
              <MetricTile
                label="Engagements"
                value={engagements.value}
                denominator="likes, comments, shares and saves"
                source={engagements.source}
                lastUpdatedAt={engagements.captured_at}
              />
            )}
            {engagements && reach && (
              <MetricTile
                className="col-span-2"
                label="Engagement rate"
                value={(engagements.value / reach.value) * 100}
                isRate
                denominator="engagements ÷ reach"
                source={weakestSource(engagements, reach)}
                lastUpdatedAt={engagements.captured_at}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}

/**
 * A derived figure is only as trustworthy as its least trustworthy input, so
 * a rate computed from creator-submitted data is never labelled API-verified.
 */
function weakestSource(...snapshots: MetricSnapshot[]): MetricSnapshot["source"] {
  const rank: Record<MetricSnapshot["source"], number> = {
    creator_submitted: 0,
    manual_import: 1,
    admin_verified: 2,
    api: 3,
  };
  return snapshots.reduce((weakest, s) =>
    rank[s.source] < rank[weakest.source] ? s : weakest,
  ).source;
}
