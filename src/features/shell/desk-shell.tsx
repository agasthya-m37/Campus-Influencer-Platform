"use client";

import {
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  Gauge,
  History,
  Link2,
  Megaphone,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

import { DevBar } from "@/features/shell/dev-bar";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

/** Brand-side only. Puzzle Media reviews from the admin console. */
const REVIEWER_NAV: NavLink[] = [
  { href: "/reviewer/queue", label: "Review queue", icon: ClipboardList },
  { href: "/reviewer/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/reviewer/settings", label: "Settings", icon: Settings },
];

const ADMIN_NAV: NavLink[] = [
  { href: "/admin/overview", label: "Overview", icon: Gauge },
  { href: "/admin/review", label: "Content review", icon: FileCheck2 },
  { href: "/admin/creators", label: "Creators", icon: Users },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/sla", label: "SLA queue", icon: History },
  { href: "/admin/live-posts", label: "Live links", icon: Link2 },
  { href: "/admin/metrics", label: "Metrics", icon: ClipboardCheck },
  { href: "/admin/earnings", label: "Earnings", icon: Wallet },
  { href: "/admin/audit", label: "Audit log", icon: ClipboardList },
];

/**
 * The desktop chrome for the reviewer and admin portals: a persistent
 * sidebar above 1024px, a top bar below it. Denser than the creator portal
 * because these are data tools, not a phone app.
 */
export function DeskShell({
  portal,
  children,
}: {
  portal: "reviewer" | "admin";
  children: ReactNode;
}) {
  const pathname = usePathname();
  const nav = portal === "reviewer" ? REVIEWER_NAV : ADMIN_NAV;

  return (
    <div className="min-h-dvh bg-surface-sunken lg:flex" data-density="compact">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <span
            className="flex size-7 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground"
            aria-hidden
          >
            P
          </span>
          <span className="font-display text-sm font-semibold">
            {portal === "reviewer" ? "Brand desk" : "Operations"}
          </span>
        </div>

        <nav aria-label="Sections" className="flex-1 space-y-0.5 p-2">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Below lg the sidebar collapses into a scrollable strip. */}
        <header className="sticky top-0 z-30 border-b bg-surface lg:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <span
              className="flex size-7 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground"
              aria-hidden
            >
              P
            </span>
            <span className="font-display text-sm font-semibold">
              {portal === "reviewer" ? "Brand desk" : "Operations"}
            </span>
          </div>
          <nav
            aria-label="Sections"
            className="flex gap-1 overflow-x-auto border-t px-2 py-2"
          >
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                    active
                      ? "bg-secondary font-medium text-secondary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</main>
      </div>

      <DevBar />
    </div>
  );
}
