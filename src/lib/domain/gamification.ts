/**
 * Gamification layer — levels, XP, streaks and achievements.
 *
 * Everything here is *derived*, never stored. There is no new entity and no
 * change to the mock schema: a level is a pure function of the profile,
 * tasks and campaigns the app already fetches, so it can never drift out of
 * sync with the real signals it summarizes, and it disappears cleanly if the
 * feature is ever pulled.
 *
 * XP model (kept intentionally simple — tune the weights here, nowhere else):
 *   - 1 XP per profile-completeness point (0–100 XP)
 *   - 40 XP per completed task (closed with status "completed")
 *   - 120 XP per completed campaign (participation_status === "completed")
 *
 * Levels are XP thresholds. Five tiers, cutesy-but-plausible naming that
 * still reads fine in a professional context:
 *   L1 Newcomer        0+
 *   L2 Rising Creator   150+
 *   L3 Campus Regular   350+
 *   L4 Campaign Pro     650+
 *   L5 Campus Icon     1000+
 */

import type { CampaignAssignment, Task } from "@/lib/types";

export interface LevelDefinition {
  level: number;
  name: string;
  minXp: number;
}

export const LEVELS: LevelDefinition[] = [
  { level: 1, name: "Newcomer", minXp: 0 },
  { level: 2, name: "Rising Creator", minXp: 150 },
  { level: 3, name: "Campus Regular", minXp: 350 },
  { level: 4, name: "Campaign Pro", minXp: 650 },
  { level: 5, name: "Campus Icon", minXp: 1000 },
];

const XP_PER_COMPLETENESS_POINT = 1;
const XP_PER_COMPLETED_TASK = 40;
const XP_PER_COMPLETED_CAMPAIGN = 120;

export interface XpBreakdown {
  fromProfile: number;
  fromTasks: number;
  fromCampaigns: number;
  total: number;
}

export interface LevelProgress {
  xp: XpBreakdown;
  current: LevelDefinition;
  next: LevelDefinition | null;
  /** 0–100, how far into the current level the creator has climbed. */
  progressPercent: number;
  /** XP still needed to reach `next`, null once at the top level. */
  xpToNext: number | null;
}

export function computeXp(
  completenessScore: number,
  tasks: Task[],
  assignments: CampaignAssignment[],
): XpBreakdown {
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const completedCampaigns = assignments.filter(
    (a) => a.participation_status === "completed",
  ).length;

  const fromProfile = Math.round(completenessScore * XP_PER_COMPLETENESS_POINT);
  const fromTasks = completedTasks * XP_PER_COMPLETED_TASK;
  const fromCampaigns = completedCampaigns * XP_PER_COMPLETED_CAMPAIGN;

  return {
    fromProfile,
    fromTasks,
    fromCampaigns,
    total: fromProfile + fromTasks + fromCampaigns,
  };
}

export function levelForXp(xp: number): LevelDefinition {
  let match = LEVELS[0];
  for (const def of LEVELS) {
    if (xp >= def.minXp) match = def;
  }
  return match;
}

export function levelProgress(
  completenessScore: number,
  tasks: Task[],
  assignments: CampaignAssignment[],
): LevelProgress {
  const xp = computeXp(completenessScore, tasks, assignments);
  const currentIndex = LEVELS.findIndex((l) => l.level === levelForXp(xp.total).level);
  const current = LEVELS[currentIndex];
  const next = LEVELS[currentIndex + 1] ?? null;

  if (!next) {
    return { xp, current, next: null, progressPercent: 100, xpToNext: null };
  }

  const span = next.minXp - current.minXp;
  const into = xp.total - current.minXp;
  const progressPercent = Math.max(0, Math.min(100, Math.round((into / span) * 100)));

  return {
    xp,
    current,
    next,
    progressPercent,
    xpToNext: Math.max(0, next.minXp - xp.total),
  };
}

/* ── streaks ───────────────────────────────────────────────────────── */

export interface StreakInfo {
  /** Consecutive days (through today or yesterday) with a task closed. */
  currentDays: number;
  /** Whether today already has activity — purely informational. */
  activeToday: boolean;
}

/**
 * Streaks are computed from closed tasks (`closed_at`), because a task
 * closing is the one activity signal every creator produces regardless of
 * which campaigns they are on — submitting drafts, links and results all
 * close a task. A day counts if at least one task closed on it.
 */
export function computeStreak(tasks: Task[], now: Date = new Date()): StreakInfo {
  const closedDates = new Set(
    tasks
      .filter((t) => t.closed_at)
      .map((t) => new Date(t.closed_at as string).toDateString()),
  );

  if (closedDates.size === 0) return { currentDays: 0, activeToday: false };

  const dayMs = 86_400_000;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const activeToday = closedDates.has(today.toDateString());

  // Walk backward from today (or yesterday, if nothing happened yet today)
  // counting consecutive covered days.
  let cursor = new Date(today);
  if (!activeToday) cursor = new Date(cursor.getTime() - dayMs);

  let streak = 0;
  while (closedDates.has(cursor.toDateString())) {
    streak += 1;
    cursor = new Date(cursor.getTime() - dayMs);
  }

  return { currentDays: streak, activeToday };
}

/* ── achievements ──────────────────────────────────────────────────── */

export type AchievementId =
  | "first_deliverable"
  | "profile_complete"
  | "five_campaign_streak"
  | "top_performer_week"
  | "on_a_roll";

export interface Achievement {
  id: AchievementId;
  label: string;
  description: string;
  unlocked: boolean;
}

export interface AchievementInput {
  completenessScore: number;
  completedTasks: number;
  completedCampaigns: number;
  streakDays: number;
  /** True when a live post's engagement rate is this week's best among peers-of-one (self-best). */
  isTopPerformerThisWeek: boolean;
}

/**
 * Milestone unlock rules. Kept declarative so a new achievement is a single
 * entry, not a new code path.
 */
export function computeAchievements(input: AchievementInput): Achievement[] {
  return [
    {
      id: "first_deliverable",
      label: "First Deliverable",
      description: "Submit your first script, video or link.",
      unlocked: input.completedTasks >= 1,
    },
    {
      id: "profile_complete",
      label: "Profile Perfected",
      description: "Get your profile to 100% complete.",
      unlocked: input.completenessScore >= 100,
    },
    {
      id: "five_campaign_streak",
      label: "5-Campaign Streak",
      description: "Finish five campaigns for Puzzle Media brands.",
      unlocked: input.completedCampaigns >= 5,
    },
    {
      id: "top_performer_week",
      label: "Top Performer This Week",
      description: "Post the best engagement rate of your recent work.",
      unlocked: input.isTopPerformerThisWeek,
    },
    {
      id: "on_a_roll",
      label: "On a Roll",
      description: "Keep a 3-day activity streak going.",
      unlocked: input.streakDays >= 3,
    },
  ];
}

/* ── performance tiers ─────────────────────────────────────────────── */

export type PerformanceTier = "bronze" | "silver" | "gold";

export interface PerformanceTierInfo {
  tier: PerformanceTier;
  label: string;
}

/**
 * Tiers derived from engagement rate (engagements ÷ reach), the same figure
 * already computed on the performance screen. Thresholds are illustrative,
 * not benchmarked against real platform medians — documented here so anyone
 * tuning them later knows where the numbers came from (none; they are a
 * starting point for the gamification pass, not an analytics claim).
 */
export function performanceTier(engagementRatePercent: number): PerformanceTierInfo {
  if (engagementRatePercent >= 8) return { tier: "gold", label: "Gold tier" };
  if (engagementRatePercent >= 4) return { tier: "silver", label: "Silver tier" };
  return { tier: "bronze", label: "Bronze tier" };
}
