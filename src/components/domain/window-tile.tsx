import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type WindowTileFill = "lime" | "paper" | "neutral" | "orange";

// lime/paper/orange are Layer 1 primitives, always light and never remapped
// for dark mode (see globals.css) — `on-light-fill` pins their text to ink
// regardless of theme. `neutral` uses --surface-raised, which IS remapped
// for dark mode, so it stays on the theme's own foreground color.
const FILL_CLASS: Record<WindowTileFill, string> = {
  lime: "bg-[var(--pm-lime-200)] on-light-fill",
  paper: "bg-[var(--pm-paper-200)] on-light-fill",
  neutral: "bg-[var(--surface-raised)]",
  orange: "bg-[var(--pm-orange-100)] on-light-fill",
};

interface WindowTileProps {
  fill?: WindowTileFill;
  size?: "md" | "lg";
  className?: string;
  children: ReactNode;
}

/**
 * The Apple-Fitness-style "window": a self-contained square-ish card with a
 * flat colour fill, used wherever the dashboard used to render a thin
 * full-width list row. Always `card-hard` underneath — this is a styled
 * wrapper, not a new design system.
 */
const ON_LIGHT_FILL: Record<WindowTileFill, boolean> = {
  lime: true,
  paper: true,
  neutral: false,
  orange: true,
};

export function WindowTile({
  fill = "neutral",
  size = "md",
  className,
  children,
}: WindowTileProps) {
  const onLight = ON_LIGHT_FILL[fill];
  return (
    <div
      className={cn(
        size === "lg"
          ? onLight
            ? "card-hard-lg-on-light"
            : "card-hard-lg"
          : onLight
            ? "card-hard-on-light"
            : "card-hard",
        "rounded-[var(--radius-lg)] p-4",
        FILL_CLASS[fill],
        className,
      )}
    >
      {children}
    </div>
  );
}
