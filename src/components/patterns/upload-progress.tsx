"use client";

import { Pause, Play, RotateCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { UploadSnapshot } from "@/lib/api/mock/upload";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadProgressProps {
  snapshot: UploadSnapshot;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onCancel: () => void;
  className?: string;
}

/**
 * Pure: takes a snapshot, emits intent. The session lives in a hook, which
 * is what makes this testable without a fake timer.
 */
export function UploadProgress({
  snapshot,
  onPause,
  onResume,
  onRetry,
  onCancel,
  className,
}: UploadProgressProps) {
  const percent = Math.round(snapshot.progress * 100);

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{snapshot.fileName}</p>
          <p className="mt-0.5 font-mono text-caption tabular text-muted-foreground">
            {formatBytes(snapshot.uploadedBytes)} of {formatBytes(snapshot.totalBytes)}
          </p>
        </div>
        <span className="font-mono text-sm tabular">{percent}%</span>
      </div>

      <Progress
        value={percent}
        className="mt-3 h-2"
        aria-label={`Upload ${percent}% complete`}
      />

      {snapshot.error && (
        <p role="alert" className="mt-2 text-sm text-status-danger-fg">
          {snapshot.error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {snapshot.status === "uploading" && (
          <Button variant="outline" size="sm" onClick={onPause}>
            <Pause className="size-3.5" aria-hidden />
            Pause
          </Button>
        )}
        {snapshot.status === "paused" && (
          <Button variant="outline" size="sm" onClick={onResume}>
            <Play className="size-3.5" aria-hidden />
            Resume
          </Button>
        )}
        {snapshot.status === "error" && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw className="size-3.5" aria-hidden />
            Resume upload
          </Button>
        )}
        {snapshot.status !== "complete" && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="size-3.5" aria-hidden />
            Cancel
          </Button>
        )}
        {snapshot.status === "complete" && (
          <p className="text-sm text-status-success-fg">Upload complete</p>
        )}
      </div>
    </div>
  );
}
