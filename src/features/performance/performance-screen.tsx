"use client";

import { BarChart3, ExternalLink } from "lucide-react";
import { useState } from "react";

import { MetricTile } from "@/components/domain/metric-tile";
import { PageHeader, SectionHeader } from "@/components/patterns/section";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { Progress } from "@/components/ui/progress";
import { api, type PerformanceRow } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useQuery } from "@/lib/api/hooks";
import { METRICS_PENDING_EXPLAINER, METRICS_WINDOW_DAYS } from "@/lib/format/copy";
import { addDays, durationBetween, formatCountdown, formatDate } from "@/lib/format/datetime";
import type { MetricSnapshot } from "@/lib/types";

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
            <PostPerformance key={row.livePost.id} row={row} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostPerformance({ row, now }: { row: PerformanceRow; now: Date }) {
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

      {/* The countdown, so a screen with no final numbers never reads as broken. */}
      {!isSettled && (
        <div className="rounded-lg border border-status-info-border bg-status-info-bg p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-medium text-status-info-fg">
              Final results in {formatCountdown(untilSettled)}
            </p>
            <p className="font-mono text-caption tabular text-muted-foreground">
              day {Math.min(METRICS_WINDOW_DAYS, Math.ceil(elapsedFraction * METRICS_WINDOW_DAYS))} of{" "}
              {METRICS_WINDOW_DAYS}
            </p>
          </div>
          <Progress value={elapsedFraction * 100} className="mt-3 h-1.5" />
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
