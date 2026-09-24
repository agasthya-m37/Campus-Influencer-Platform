import { Star } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { LevelProgress } from "@/lib/domain/gamification";

interface XpBarProps {
  progress: LevelProgress;
  /** Compact drops the level name/XP-to-next caption, for tight spaces. */
  compact?: boolean;
  className?: string;
}

/**
 * Lime-filled level-progress bar. Wraps the existing Progress primitive
 * rather than replacing it — same track, same height contract, only the
 * fill color and the level chrome around it are new.
 *
 * Always sits on `--pm-lime-200`, a light fill that is never remapped for
 * dark mode (see globals.css) — so its own text colors are hardcoded to the
 * ink scale rather than the theme's `--foreground`/`--muted-foreground`,
 * which flip to near-white in dark mode and would be unreadable here.
 */
export function XpBar({ progress, compact = false, className }: XpBarProps) {
  const { current, next, progressPercent, xpToNext, xp } = progress;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-[var(--pm-ink-900)]">
          <Star className="size-3.5 text-primary" aria-hidden />
          Level {current.level} · {current.name}
        </span>
        <span className="font-mono text-caption tabular text-[var(--pm-ink-500)]">
          {xp.total} XP
        </span>
      </div>

      <Progress
        value={progressPercent}
        className="h-2 bg-[var(--pm-ink-900)]/10 [&>[data-slot=progress-indicator]]:bg-[var(--pm-lime-700)]"
      />

      {!compact && (
        <p className="text-caption text-[var(--pm-ink-500)]">
          {next
            ? `${xpToNext} XP to Level ${next.level} · ${next.name}`
            : "Highest level reached — Campus Icon"}
        </p>
      )}
    </div>
  );
}
