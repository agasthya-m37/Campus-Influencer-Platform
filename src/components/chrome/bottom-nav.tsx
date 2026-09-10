"use client";

import { GraduationCap, Home, ListChecks, Megaphone, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Matches nested routes so a deliverable page keeps Tasks lit. */
  match: (path: string) => boolean;
  badge?: number;
}

interface BottomNavProps {
  taskCount?: number;
  unreadCount?: number;
}

/**
 * F-DASH-05. Persistent, five items, unread badges.
 * Every target is at least 44px tall, and the bar respects the iOS home
 * indicator via safe-area inset.
 */
export function BottomNav({ taskCount = 0, unreadCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      href: "/home",
      label: "Home",
      icon: Home,
      match: (p) => p === "/home",
    },
    {
      href: "/campaigns",
      label: "Campaigns",
      icon: Megaphone,
      match: (p) => p.startsWith("/campaigns"),
    },
    {
      href: "/tasks",
      label: "Tasks",
      icon: ListChecks,
      match: (p) => p.startsWith("/tasks") || p.startsWith("/deliverables"),
      badge: taskCount,
    },
    {
      href: "/learn",
      label: "Learn",
      icon: GraduationCap,
      match: (p) => p.startsWith("/learn"),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      match: (p) => p.startsWith("/profile"),
      badge: unreadCount,
    },
  ];

  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t bg-surface md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" aria-hidden />
                  {item.badge ? (
                    <span
                      className="absolute -top-1.5 -right-2 flex min-w-4 items-center justify-center rounded-full bg-energy px-1 text-[10px] leading-4 font-semibold text-background tabular"
                      aria-hidden
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="text-[11px] leading-none font-medium">
                  {item.label}
                  {item.badge ? (
                    <span className="sr-only">, {item.badge} pending</span>
                  ) : null}
                </span>
                {active && (
                  <span
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary"
                    aria-hidden
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
