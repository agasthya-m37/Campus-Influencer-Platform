"use client";

import { Bell, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/chrome/bottom-nav";
import { TopNav } from "@/components/chrome/top-nav";
import { StreakIndicator } from "@/components/domain/streak-indicator";
import { DevBar } from "@/features/shell/dev-bar";
import { api } from "@/lib/api/client";
import { useQuery } from "@/lib/api/hooks";
import { computeStreak, levelProgress } from "@/lib/domain/gamification";
import { openTasks } from "@/lib/domain/tasks";
import { BrandGlyph } from "@/components/chrome/brand-mark";

/**
 * The creator portal's chrome. Mobile first: a compact top bar and the
 * persistent bottom nav below md, a centred column above it.
 */
export function CreatorShell({ children }: { children: ReactNode }) {
  const { data: tasks } = useQuery((signal) => api.tasks.list({ signal }), []);
  const { data: notifications } = useQuery(
    (signal) => api.notifications.list({ signal }),
    [],
  );
  const { data: campaigns } = useQuery((signal) => api.campaigns.list({ signal }), []);
  const { data: me } = useQuery((signal) => api.me.get({ signal }), []);

  const openCount = tasks ? openTasks(tasks).length : 0;
  const unread = notifications?.filter((n) => !n.read_at).length ?? 0;

  const streak = tasks ? computeStreak(tasks) : null;
  const progress =
    me?.profile && tasks
      ? levelProgress(
          me.profile.completeness_score,
          tasks,
          (campaigns?.items ?? []).map((c) => c.assignment),
        )
      : null;

  return (
    <div className="min-h-dvh bg-background">
      <header className="safe-top sticky top-0 z-30 border-b bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/home" className="flex shrink-0 items-center gap-2">
            <BrandGlyph size={28} />
            <span className="font-display hidden text-base font-semibold tracking-tight sm:inline">
              Puzzle Campus
            </span>
          </Link>

          {/* The only way to navigate at md+ — the bottom nav (below) hides
              itself past that breakpoint, so without this desktop had no
              navigation at all past the very first page. */}
          <TopNav taskCount={openCount} unreadCount={unread} level={progress?.current.level} />

          <div className="flex min-w-0 items-center gap-2">
            {/* A glimpse of level + streak, consistent with the dashboard
                hero and profile screen — full detail lives on those screens.
                Hidden at md+ since TopNav's Profile tab already carries the
                level badge there, and repeating both reads as cluttered. */}
            <div className="flex items-center gap-2 md:hidden">
              {progress && (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-ink bg-[var(--pm-lime-200)] px-2 py-0.5 text-caption font-semibold whitespace-nowrap text-ink"
                >
                  <Star className="size-3" aria-hidden />
                  Lvl {progress.current.level}
                </Link>
              )}
              {streak && streak.currentDays > 0 && (
                <StreakIndicator days={streak.currentDays} size="sm" />
              )}
            </div>

            <Link
              href="/notifications"
              aria-label={
                unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
              }
              className="relative flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="size-5" aria-hidden />
              {unread > 0 && (
                <span
                  className="absolute top-2 right-2 size-2 rounded-full bg-energy ring-2 ring-surface"
                  aria-hidden
                />
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* pb-24 clears the fixed bottom nav below md; TopNav lives in the
          header instead, so md+ only needs its own smaller pb-10. */}
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-24 md:pb-10">{children}</main>

      <BottomNav taskCount={openCount} unreadCount={unread} level={progress?.current.level} />
      <DevBar />
    </div>
  );
}
