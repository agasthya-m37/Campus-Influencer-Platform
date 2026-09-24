import { AlertCircle, Inbox, RefreshCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-border bg-surface-sunken px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mb-3 text-muted-foreground">
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </div>
      <p className="font-display text-h2">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  isOffline?: boolean;
  onRetry?: () => void;
  className?: string;
}

/** Renders any normalized ApiError, whatever its kind. */
export function ErrorState({
  title = "That did not load",
  message,
  isOffline,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-[1.5px] border-status-danger-border bg-status-danger-bg px-6 py-8 text-center shadow-[var(--shadow-hard-on-light)]",
        className,
      )}
    >
      <div className="mb-3 text-status-danger-fg">
        {isOffline ? (
          <WifiOff className="size-6" aria-hidden />
        ) : (
          <AlertCircle className="size-6" aria-hidden />
        )}
      </div>
      <p className="font-display text-h2">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border-[1.5px] border-border bg-card p-4 shadow-[var(--shadow-hard-sm-on-light)]">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-3 h-3 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
