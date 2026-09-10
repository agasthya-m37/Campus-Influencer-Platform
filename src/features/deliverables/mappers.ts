import type { VersionTimelineEntry } from "@/components/domain/version-timeline";
import { DECISION_LABEL } from "@/lib/domain/review";
import type { Tone } from "@/lib/domain/status";
import type { Review, SubmissionVersion } from "@/lib/types";

const DECISION_TONE: Record<Review["decision"], Tone> = {
  approve: "success",
  request_changes: "warn",
  reject: "danger",
};

/** Reviewer names are not exposed to creators; the stage is what matters. */
const REVIEWER_LABEL: Record<Review["stage"], string> = {
  puzzle_media: "Puzzle Media",
  brand: "Brand reviewer",
};

export function toTimelineEntries(
  versions: SubmissionVersion[],
  reviews: Review[],
): VersionTimelineEntry[] {
  return [...versions]
    .sort((a, b) => b.version_no - a.version_no)
    .map((version) => ({
      versionId: version.id,
      versionNo: version.version_no,
      submittedAt: version.submitted_at,
      submittedByLabel: "You",
      excerpt: version.content?.slice(0, 240) ?? null,
      fileCount: version.file_refs.length,
      externalLink: version.external_link,
      decisions: reviews
        .filter((r) => r.submission_version_id === version.id)
        .sort((a, b) => a.decided_at.localeCompare(b.decided_at))
        .map((r) => ({
          id: r.id,
          stage: r.stage,
          decisionLabel: DECISION_LABEL[r.decision],
          tone: DECISION_TONE[r.decision],
          reviewerLabel: REVIEWER_LABEL[r.stage],
          feedback: r.feedback,
          decidedAt: r.decided_at,
        })),
    }));
}
