import { FileText, Paperclip } from "lucide-react";

import { StatusPill } from "@/components/patterns/status-pill";
import { REVIEW_STAGE_LABEL } from "@/lib/format/copy";
import { formatFull } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/domain/status";

export interface VersionTimelineEntry {
  versionId: string;
  versionNo: number;
  submittedAt: string;
  submittedByLabel: string;
  excerpt: string | null;
  fileCount: number;
  externalLink: string | null;
  decisions: Array<{
    id: string;
    stage: "puzzle_media" | "brand";
    decisionLabel: string;
    tone: Tone;
    reviewerLabel: string;
    feedback: string;
    decidedAt: string;
  }>;
}

/**
 * F-SUB-13. An ordered history both sides see, with uploader, timestamp,
 * decision, reviewer and feedback. Nothing is ever removed — this record is
 * the whole reason the product beats a shared drive.
 */
export function SubmissionVersionTimeline({
  entries,
  className,
}: {
  entries: VersionTimelineEntry[];
  className?: string;
}) {
  return (
    <ol className={cn("relative space-y-6", className)}>
      {entries.map((entry, index) => (
        <li key={entry.versionId} className="relative pl-7">
          {/* Connector line, stopping at the last item. */}
          {index < entries.length - 1 && (
            <span
              className="absolute top-6 bottom-[-1.5rem] left-[9px] w-px bg-border"
              aria-hidden
            />
          )}
          <span
            className="absolute top-1.5 left-0 flex size-[19px] items-center justify-center rounded-full border-2 border-background bg-muted"
            aria-hidden
          >
            <FileText className="size-2.5 text-muted-foreground" />
          </span>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-sm font-medium tabular">
                v{entry.versionNo}
              </p>
              <p className="text-caption text-muted-foreground">
                {entry.submittedByLabel} · {formatFull(entry.submittedAt)}
              </p>
            </div>

            {entry.excerpt && (
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                {entry.excerpt}
              </p>
            )}

            {(entry.fileCount > 0 || entry.externalLink) && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                <Paperclip className="size-3" aria-hidden />
                {entry.fileCount > 0
                  ? `${entry.fileCount} file${entry.fileCount > 1 ? "s" : ""}`
                  : "External preview link"}
              </p>
            )}

            {entry.decisions.length > 0 && (
              <div className="mt-3 space-y-3 border-t pt-3">
                {entry.decisions.map((decision) => (
                  <div key={decision.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        size="sm"
                        status={{
                          tone: decision.tone,
                          icon:
                            decision.tone === "success"
                              ? "check"
                              : decision.tone === "danger"
                                ? "x"
                                : "pencil",
                          label: decision.decisionLabel,
                        }}
                      />
                      <span className="text-caption text-muted-foreground">
                        {REVIEW_STAGE_LABEL[decision.stage]} · {decision.reviewerLabel}
                      </span>
                    </div>
                    {decision.feedback && (
                      <p className="mt-1.5 text-sm">{decision.feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
