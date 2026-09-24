"use client";

import { AtSign, Check, LogOut, Moon, Play, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { AchievementBadge } from "@/components/domain/achievement-badge";
import { StreakIndicator } from "@/components/domain/streak-indicator";
import { XpBar } from "@/components/domain/xp-bar";
import { PageHeader, SectionHeader } from "@/components/patterns/section";
import { CardSkeleton, ErrorState } from "@/components/patterns/states";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useQuery } from "@/lib/api/hooks";
import {
  computeAchievements,
  computeStreak,
  levelProgress,
} from "@/lib/domain/gamification";
import { formatHandle } from "@/lib/format/copy";
import { formatCompact } from "@/lib/format/currency";
import { formatFull } from "@/lib/format/datetime";
import type { AccountType, ConsentType } from "@/lib/types";

const CONSENT_LABEL: Record<ConsentType, string> = {
  terms: "Terms of use",
  privacy: "Privacy policy",
  content_usage: "Content usage",
  age_eligibility: "Age and eligibility",
};

/** F-IAM-09: account type decides whether metrics can sync automatically. */
const ACCOUNT_TYPE_HELP: Record<AccountType, string> = {
  personal: "Personal accounts cannot share numbers automatically. You will add results yourself.",
  business: "Your results sync automatically.",
  creator: "Your results sync automatically.",
};

export function ProfileScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.me.get({ signal }),
    [],
  );
  // These already back other screens (Dashboard, Tasks, Performance) — reused
  // here rather than re-fetched with different shapes, so level/streak/
  // achievements never disagree between screens.
  const tasksQuery = useQuery((signal) => api.tasks.list({ signal }), []);
  const campaignsQuery = useQuery((signal) => api.campaigns.list({ signal }), []);
  const performanceQuery = useQuery((signal) => api.performance.list({ signal }), []);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (error) {
    return (
      <ErrorState
        message={messageFor(error)}
        isOffline={error.kind === "network"}
        onRetry={refetch}
      />
    );
  }
  if (isLoading || !data) return <CardSkeleton rows={3} />;

  const { user, profile, socialAccounts, consents } = data;
  const tasks = tasksQuery.data ?? [];
  const campaigns = campaignsQuery.data?.items ?? [];
  const performanceRows = performanceQuery.data?.items ?? [];

  const streak = computeStreak(tasks);
  const progress = profile
    ? levelProgress(
        profile.completeness_score,
        tasks,
        campaigns.map((c) => c.assignment),
      )
    : null;

  // Same "best engagement rate among this creator's own posts" heuristic the
  // performance screen's tiers are built on — self-best, not a leaderboard.
  const bestEngagementRate = performanceRows.reduce((best, row) => {
    const engagements = row.snapshots.find((s) => s.metric_type === "engagements");
    const reach = row.snapshots.find((s) => s.metric_type === "reach");
    if (!engagements || !reach || reach.value === 0) return best;
    return Math.max(best, (engagements.value / reach.value) * 100);
  }, 0);

  const achievements = profile
    ? computeAchievements({
        completenessScore: profile.completeness_score,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        completedCampaigns: campaigns.filter(
          (c) => c.assignment.participation_status === "completed",
        ).length,
        streakDays: streak.currentDays,
        isTopPerformerThisWeek: bestEngagementRate >= 8,
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" />

      {profile && progress && (
        <>
          <section className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-4">
              <Avatar size="lg" className="shrink-0">
                <AvatarImage src={profile.photo ?? undefined} alt="" />
                <AvatarFallback>
                  {profile.display_name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
                <AvatarBadge
                  className="text-[9px] font-bold"
                  aria-label={`Level ${progress.current.level}`}
                >
                  {progress.current.level}
                </AvatarBadge>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-h1">{profile.display_name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile.course} · Year {profile.year} · Graduating {profile.grad_year}
                </p>
              </div>
              <StreakIndicator days={streak.currentDays} size="sm" className="shrink-0" />
            </div>
            <p className="mt-3 text-sm">{profile.bio}</p>
          </section>

          <section className="space-y-3">
            <SectionHeader title="Level up your profile" />
            <div className="card-hard-on-light on-light-fill rounded-[var(--radius-lg)] bg-[var(--pm-lime-200)] p-4">
              <XpBar progress={progress} />
              {profile.completeness_score < 100 && (
                <p className="mt-3 border-t border-ink/10 pt-3 text-sm">
                  Add your typical view count so brands can match you better —
                  and pick up the XP that comes with it.
                </p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Achievements"
              description={`${achievements.filter((a) => a.unlocked).length} of ${achievements.length} unlocked`}
            />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {achievements.map((achievement) => (
                <AchievementBadge key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </section>
        </>
      )}

      <section className="space-y-3">
        <SectionHeader title="Your accounts" />
        <ul className="space-y-2">
          {socialAccounts.map((account) => (
            <li key={account.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {account.platform === "instagram" ? (
                    <AtSign className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <Play className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{formatHandle(account.handle)}</p>
                    <p className="text-caption text-muted-foreground tabular">
                      {formatCompact(account.followers)} followers
                    </p>
                  </div>
                </div>
                <Badge
                  variant={account.account_type === "personal" ? "secondary" : "default"}
                  className="shrink-0 capitalize"
                >
                  {account.account_type}
                </Badge>
              </div>
              <p className="mt-2 text-caption text-muted-foreground">
                {ACCOUNT_TYPE_HELP[account.account_type]}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* F-ONB-05: each declaration is its own record, shown with its version. */}
      <section className="space-y-3">
        <SectionHeader
          title="What you agreed to"
          description="Kept exactly as you accepted it."
        />
        <ul className="divide-y rounded-lg border bg-card">
          {consents.map((consent) => (
            <li key={consent.id} className="flex items-start gap-3 p-4">
              <Check className="mt-0.5 size-4 shrink-0 text-status-success-fg" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium">{CONSENT_LABEL[consent.type]}</p>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  {consent.document_version} · accepted {formatFull(consent.accepted_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Settings" />
        <div className="space-y-2">
          {mounted && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="size-4" aria-hidden />
              ) : (
                <Moon className="size-4" aria-hidden />
              )}
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </Button>
          )}
          <Button variant="outline" className="w-full justify-start text-muted-foreground">
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </div>
        <p className="text-caption text-muted-foreground">
          Signed in as {user.phone}
        </p>
      </section>
    </div>
  );
}
