import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * F-SUB-07. When video is locked the creator sees why and what unlocks it —
 * and, importantly, no upload control is rendered at all.
 */
export function GatingNotice({
  reason,
  className,
}: {
  reason: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-dashed bg-surface-sunken p-4",
        className,
      )}
    >
      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{reason}</p>
    </div>
  );
}
