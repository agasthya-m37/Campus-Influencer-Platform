"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/chrome/bottom-nav";
import { DevBar } from "@/features/shell/dev-bar";
import { api } from "@/lib/api/client";
import { useQuery } from "@/lib/api/hooks";
import { openTasks } from "@/lib/domain/tasks";

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

  const openCount = tasks ? openTasks(tasks).length : 0;
  const unread = notifications?.filter((n) => !n.read_at).length ?? 0;

  return (
    <div className="min-h-dvh bg-background">
      <header className="safe-top sticky top-0 z-30 border-b bg-surface">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/home" className="flex items-center gap-2">
            <span
              className="flex size-7 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground"
              aria-hidden
            >
              P
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              Puzzle Campus
            </span>
          </Link>

          <Link
            href="/notifications"
            aria-label={
              unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
            }
            className="relative flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
      </header>

      {/* pb-24 clears the fixed bottom nav so the last card is never trapped. */}
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-24 md:pb-10">{children}</main>

      <BottomNav taskCount={openCount} unreadCount={unread} />
      <DevBar />
    </div>
  );
}
