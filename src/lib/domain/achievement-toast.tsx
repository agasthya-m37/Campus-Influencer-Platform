"use client";

import { Award, Flame, Sparkles, Star, Trophy, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import type { Achievement, AchievementId } from "@/lib/domain/gamification";

const ICON: Record<AchievementId, LucideIcon> = {
  first_deliverable: Sparkles,
  profile_complete: Star,
  five_campaign_streak: Trophy,
  top_performer_week: Award,
  on_a_roll: Flame,
};

/**
 * Fires a celebratory toast on top of the app's existing `sonner` Toaster
 * (mounted once in `app/layout.tsx`). This adds no animation of its own —
 * sonner's enter/exit transitions are already short CSS transitions, which
 * the global `prefers-reduced-motion` rule in globals.css already zeroes.
 */
export function celebrateAchievement(achievement: Achievement) {
  const Icon = ICON[achievement.id];
  toast.success(`Achievement unlocked: ${achievement.label}`, {
    description: achievement.description,
    icon: <Icon className="size-4" aria-hidden />,
  });
}

const SEEN_KEY = "pm.achievements.seen";

function readSeen(): Set<AchievementId> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<AchievementId>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // Best effort — a private window or blocked storage just means the
    // celebration can repeat once per tab session, which is harmless.
  }
}

/**
 * Diffs the current achievement list against what this browser tab has
 * already celebrated (tracked in sessionStorage, per-viewer only) and
 * toasts for anything newly unlocked. The first render of a tab seeds the
 * "seen" set without celebrating, so a creator who is already Level 3 on
 * their first visit today does not get five toasts at once — only a
 * genuinely new unlock, discovered on a later render, celebrates.
 */
export function celebrateNewlyUnlocked(achievements: Achievement[]) {
  if (typeof window === "undefined") return;

  const seen = readSeen();
  const isFirstRun = seen.size === 0 && !sessionStorage.getItem(`${SEEN_KEY}.init`);

  let changed = false;
  for (const achievement of achievements) {
    if (!achievement.unlocked || seen.has(achievement.id)) continue;
    seen.add(achievement.id);
    changed = true;
    if (!isFirstRun) celebrateAchievement(achievement);
  }

  if (isFirstRun) {
    try {
      sessionStorage.setItem(`${SEEN_KEY}.init`, "1");
    } catch {
      // Ignore — worst case the seeding runs again next render.
    }
  }

  if (changed) writeSeen(seen);
}
