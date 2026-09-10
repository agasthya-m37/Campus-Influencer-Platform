import {
  AlertTriangle,
  Check,
  Circle,
  Clock,
  Eye,
  Lock,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import type { ComponentType } from "react";

import { TONE_CLASS, type StatusDescriptor, type ToneIcon } from "@/lib/domain/status";
import { cn } from "@/lib/utils";

const ICONS: Record<ToneIcon, ComponentType<{ className?: string }>> = {
  circle: Circle,
  clock: Clock,
  eye: Eye,
  pencil: Pencil,
  check: Check,
  x: X,
  lock: Lock,
  alert: AlertTriangle,
  upload: Upload,
};

interface StatusPillProps {
  status: StatusDescriptor;
  size?: "sm" | "md";
  className?: string;
}

/**
 * The one pill for every status in the product.
 *
 * Always icon plus text: status is never carried by colour alone, both for
 * WCAG 1.4.1 and because these are read at a glance on a phone in sunlight.
 */
export function StatusPill({ status, size = "md", className }: StatusPillProps) {
  const Icon = ICONS[status.icon];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-caption" : "px-2.5 py-1 text-sm",
        TONE_CLASS[status.tone],
        className,
      )}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "size-3" : "size-3.5")} />
      {status.label}
    </span>
  );
}
