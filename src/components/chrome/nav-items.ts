import { GraduationCap, Home, ListChecks, Megaphone, User } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Matches nested routes so a deliverable page keeps Tasks lit. */
  match: (path: string) => boolean;
  badge?: number;
  /** A small lime level chip, distinct from the orange unread/task badge. */
  levelBadge?: number;
}

export interface NavItemsInput {
  taskCount?: number;
  unreadCount?: number;
  level?: number;
}

/**
 * The five primary destinations, shared between `BottomNav` (mobile, fixed
 * to the viewport bottom) and `TopNav` (desktop, inline in the header) so
 * the set of routes, icons and badge rules can never drift between the two.
 */
export function navItems({ taskCount = 0, unreadCount = 0, level }: NavItemsInput): NavItem[] {
  return [
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
      levelBadge: level,
    },
  ];
}
