"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Megaphone,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { ActionRequiredCard } from "@/components/domain/action-required-card";
import { TaskCard } from "@/components/domain/task-card";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { SectionHeader } from "@/components/patterns/section";
import { StatusPill } from "@/components/patterns/status-pill";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useQuery } from "@/lib/api/hooks";
import { participationStatus } from "@/lib/domain/status";
import { openTasks, sortByUrgency, topActionRequired } from "@/lib/domain/tasks";
import { formatMoney } from "@/lib/format/currency";
import { EARNINGS } from "@/lib/format/copy";
import { formatDate } from "@/lib/format/datetime";
import { isWorking } from "@/lib/domain/participation";
import { toActionRequiredView, toTaskCardView } from "@/features/dashboard/mappers";

/**
 * F-DASH-03: action required, my campaigns, my submissions, my earnings,
 * my impact, events and learning, announcements, profile completeness —
 * in that priority order, with the action card above the fold at 360×640.
 */
export function DashboardScreen() {
  const tasksQuery = useQuery((signal) => api.tasks.list({ signal }), []);
  const campaignsQuery = useQuery((signal) => api.campaigns.list({ signal }), []);
  const earningsQuery = useQuery((signal) => api.earnings.list({ signal }), []);
  const eventsQuery = useQuery((signal) => api.events.list({ signal }), []);
  const meQuery = useQuery((signal) => api.me.get({ signal }), []);

  if (tasksQuery.error) {
    return (
      <ErrorState
        message={messageFor(tasksQuery.error)}
        isOffline={tasksQuery.error.kind === "network"}
        onRetry={tasksQuery.refetch}
      />
    );
  }

  const isLoading = tasksQuery.isLoading || campaignsQuery.isLoading;
  const tasks = tasksQuery.data ?? [];
  const campaigns = campaignsQuery.data?.items ?? [];
  const campaignById = new Map(campaigns.map((c) => [c.campaign.id, c.campaign]));

  // F-DASH-01 + F-TASK-01: the card reads the top of the same queue /tasks
  // renders. Not a parallel calculation.
  const top = topActionRequired(tasks);
  const rest = sortByUrgency(openTasks(tasks)).slice(1, 4);

  const activeCampaigns = campaigns.filter((c) =>
    isWorking(c.assignment.participation_status),
  );
  const invitations = campaigns.filter(
    (c) => c.assignment.participation_status === "invited",
  );

  const earningRows = earningsQuery.data?.items ?? [];
  const totals = earningRows.reduce(
    (acc, row) => {
      const amount = row.earning?.amount ?? row.assignment.fee_amount ?? 0;
      if (row.earning?.status === "paid") acc.paid += amount;
      else if (row.earning?.status === "payment_pending") acc.pending += amount;
      acc.total += amount;
      return acc;
    },
    { total: 0, pending: 0, paid: 0 },
  );

  const upcoming = (eventsQuery.data?.items ?? [])
    .filter((e) => new Date(e.event.starts_at) > new Date())
    .slice(0, 1);

  const profile = meQuery.data?.profile;
  const firstName = profile?.display_name.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Hello, {firstName}</p>
        <h1 className="mt-0.5 font-display text-display leading-none">
          {top ? "One thing needs you" : "You are all caught up"}
        </h1>
      </div>

      {/* 1 — Action required */}
      {isLoading ? (
        <CardSkeleton rows={1} />
      ) : top ? (
        <ActionRequiredCard
          view={toActionRequiredView(top, campaignById.get(top.campaign_id ?? ""))}
        />
      ) : (
        <EmptyState
          icon={<CheckCircle2 className="size-6" />}
          title="Nothing is waiting on you"
          description="When a reviewer responds or a new campaign arrives, it shows up here first."
        />
      )}

      {/* Remaining open tasks — keeps every pending item within two taps */}
      {rest.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            title="Also open"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/tasks">
                  All tasks
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            }
          />
          <div className="space-y-2">
            {rest.map((task) => (
              <TaskCard
                key={task.id}
                view={toTaskCardView(task, campaignById.get(task.campaign_id ?? ""))}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2 — My campaigns */}
      <section className="space-y-3">
        <SectionHeader
          title="My campaigns"
          description={
            invitations.length > 0
              ? `${invitations.length} invitation${invitations.length > 1 ? "s" : ""} waiting`
              : undefined
          }
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/campaigns">
                See all
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          }
        />
        {campaignsQuery.isLoading ? (
          <CardSkeleton rows={2} />
        ) : activeCampaigns.length + invitations.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="size-6" />}
            title="No campaigns yet"
            description="Puzzle Media invites you when a brand matches your profile."
          />
        ) : (
          <div className="space-y-2">
            {[...invitations, ...activeCampaigns].slice(0, 3).map((row) => (
              <Link
                key={row.assignment.id}
                href={`/campaigns/${row.campaign.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.campaign.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{row.brand.name}</p>
                </div>
                <StatusPill
                  size="sm"
                  status={participationStatus(row.assignment.participation_status)}
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3 — My earnings. Exact strings from copy.ts; no money moves here. */}
      <section className="space-y-3">
        <SectionHeader
          title="My earnings"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/earnings">
                Details
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          }
        />
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: EARNINGS.TOTAL, value: totals.total },
            { label: EARNINGS.PENDING, value: totals.pending },
            { label: EARNINGS.PAID, value: totals.paid },
          ].map((tile) => (
            <div key={tile.label} className="rounded-lg border bg-card p-3">
              <p className="text-caption leading-tight text-muted-foreground">
                {tile.label}
              </p>
              <p className="mt-1.5 font-display text-h2 tabular">
                {formatMoney(tile.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — My impact */}
      <section className="space-y-3">
        <SectionHeader title="My impact" />
        <Link
          href="/performance"
          className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
        >
          <TrendingUp className="size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">See how your posts performed</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Results settle seven days after you post.
            </p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </section>

      {/* 5 — Events and learning */}
      <section className="space-y-3">
        <SectionHeader
          title="Events & learning"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/learn">
                All events
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          }
        />
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-6" />}
            title="No upcoming sessions"
            description="Workshops appear here when Puzzle Media schedules them."
          />
        ) : (
          upcoming.map(({ event, rsvp }) => (
            <Link
              key={event.id}
              href="/learn"
              className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{event.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatDate(event.starts_at)}
                  {rsvp?.state === "going" && " · You are going"}
                </p>
              </div>
            </Link>
          ))
        )}
      </section>

      {/* 6 — Profile completeness */}
      {profile && profile.completeness_score < 100 && (
        <section className="space-y-3">
          <SectionHeader title="Profile completeness" />
          <Link
            href="/profile"
            className="block rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">Your profile is {profile.completeness_score}% complete</p>
              <span className="font-mono text-sm tabular text-muted-foreground">
                {profile.completeness_score}%
              </span>
            </div>
            <Progress value={profile.completeness_score} className="mt-3 h-2" />
            <p className="mt-2 text-sm text-muted-foreground">
              A fuller profile means better campaign matches.
            </p>
          </Link>
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader title="Quick links" />
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-auto justify-start py-3">
            <Link href="/earnings">
              <Wallet className="size-4" aria-hidden />
              Earnings
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start py-3">
            <Link href="/notifications">
              <Megaphone className="size-4" aria-hidden />
              Updates
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
