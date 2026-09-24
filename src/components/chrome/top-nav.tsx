"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems, type NavItemsInput } from "@/components/chrome/nav-items";
import { cn } from "@/lib/utils";

/**
 * The same five destinations as `BottomNav`, inline in the header instead of
 * fixed to the viewport bottom — this is the only way to navigate at md+,
 * where the bottom nav hides itself (`md:hidden`). Without this, widening
 * past the mobile breakpoint left the app with no navigation at all.
 */
export function TopNav({ taskCount = 0, unreadCount = 0, level }: NavItemsInput) {
  const pathname = usePathname();
  const items = navItems({ taskCount, unreadCount, level });

  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-4" aria-hidden />
                  {item.badge ? (
                    <span
                      className="absolute -top-1.5 -right-2 flex min-w-4 items-center justify-center rounded-full bg-energy px-1 text-[10px] leading-4 font-semibold text-background tabular"
                      aria-hidden
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : item.levelBadge ? (
                    <span
                      className="absolute -top-1.5 -right-2 flex min-w-4 items-center justify-center rounded-full border border-ink bg-[var(--pm-lime-500)] px-1 text-[10px] leading-4 font-semibold text-ink tabular"
                      aria-hidden
                    >
                      {item.levelBadge}
                    </span>
                  ) : null}
                </span>
                {item.label}
                {item.badge ? (
                  <span className="sr-only">, {item.badge} pending</span>
                ) : item.levelBadge ? (
                  <span className="sr-only">, level {item.levelBadge}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
