import { Award, Flame, Sparkles, Star, Trophy, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Achievement, AchievementId } from "@/lib/domain/gamification";

const ICON: Record<AchievementId, LucideIcon> = {
  first_deliverable: Sparkles,
  profile_complete: Star,
  five_campaign_streak: Trophy,
  top_performer_week: Award,
  on_a_roll: Flame,
};

interface AchievementBadgeProps {
  achievement: Achievement;
  className?: string;
}

/**
 * Unlockable achievement chip. Extends `badge.tsx`'s pill shape rather than
 * duplicating it: same border/radius/press language, new fill treatment.
 *
 * Locked vs unlocked is never colour-only — the icon desaturates, the label
 * changes to "Locked", and a lock affordance is implied by the muted
 * ink-on-paper treatment, all of which read fine without colour.
 */
export function AchievementBadge({ achievement, className }: AchievementBadgeProps) {
  const Icon = ICON[achievement.id];

  return (
    <div
      title={achievement.description}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border-[1.5px] border-ink px-3 py-3 text-center transition-colors",
        achievement.unlocked
          ? "bg-[var(--pm-lime-200)] text-ink shadow-[var(--shadow-hard-sm-on-light)]"
          : "bg-muted text-muted-foreground opacity-70",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink",
          achievement.unlocked
            ? "bg-primary text-primary-foreground"
            : "bg-card text-muted-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="text-caption leading-tight font-semibold">
        {achievement.label}
      </span>
      <span
        className={cn(
          "text-caption leading-tight",
          // Unlocked sits on the always-light lime-200 fill, never remapped
          // for dark mode, so it needs the ink-based muted tone rather than
          // the theme's --muted-foreground (near-white in dark mode).
          achievement.unlocked ? "text-[var(--pm-ink-500)]" : "text-muted-foreground",
        )}
      >
        {achievement.unlocked ? "Unlocked" : "Locked"}
      </span>
    </div>
  );
}
