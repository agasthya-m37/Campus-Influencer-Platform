/**
 * Deliverable rules: video gating (F-SUB-07) and the draft cap (F-SUB-12).
 *
 * These are the two rules a reviewer cannot eyeball, so they live here as
 * plain functions with tests rather than as conditions inside components.
 */

import type {
  Deliverable,
  DeliverableStatus,
  OwnerKind,
  SubmissionVersion,
} from "@/lib/types";

/* ── Gating ─────────────────────────────────────────────────────────── */

export interface GateResult {
  blocked: boolean;
  reason: string | null;
}

/**
 * F-SUB-07. Video submission is blocked until the linked script deliverable
 * reaches `approved`. Enforced server-side in production; this is the same
 * predicate the UI uses so the two cannot drift.
 */
export function evaluateGate(
  deliverable: Deliverable,
  blocker: Deliverable | null,
): GateResult {
  if (!deliverable.blocked_by_deliverable_id) {
    return { blocked: false, reason: null };
  }
  if (!blocker) {
    return { blocked: true, reason: "Waiting on an earlier deliverable." };
  }
  if (blocker.status === "approved") {
    return { blocked: false, reason: null };
  }
  return {
    blocked: true,
    reason:
      blocker.type === "script"
        ? "Your video unlocks once your script is approved."
        : "This unlocks once the previous step is approved.",
  };
}

/* ── Draft cap ──────────────────────────────────────────────────────── */

export interface DraftBudget {
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
  /** True once a super admin has granted rounds beyond the base limit. */
  extended: boolean;
}

/**
 * D5 — three drafts per deliverable, *including the first*, counted
 * separately for script and video. Every submitted version counts,
 * including ones that were rejected.
 */
export function draftBudget(
  deliverable: Deliverable,
  versions: SubmissionVersion[],
): DraftBudget {
  const used = versions.filter(
    (v) => v.deliverable_id === deliverable.id,
  ).length;
  const limit = deliverable.revision_limit + deliverable.extra_rounds_granted;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    exhausted: used >= limit,
    extended: deliverable.extra_rounds_granted > 0,
  };
}

export interface SubmitEligibility {
  canSubmit: boolean;
  reason: string | null;
}

/** Whether the creator may create a new submission version right now. */
export function canSubmit(
  deliverable: Deliverable,
  versions: SubmissionVersion[],
  blocker: Deliverable | null,
): SubmitEligibility {
  const gate = evaluateGate(deliverable, blocker);
  if (gate.blocked) return { canSubmit: false, reason: gate.reason };

  if (deliverable.status === "approved") {
    return { canSubmit: false, reason: "This deliverable is already approved." };
  }
  if (deliverable.status === "rejected") {
    return {
      canSubmit: false,
      reason:
        "This deliverable was rejected. Puzzle Media can reopen it if another round is agreed.",
    };
  }
  if (deliverable.status === "submitted" || deliverable.status === "under_review") {
    return { canSubmit: false, reason: "This is with the reviewer right now." };
  }

  const budget = draftBudget(deliverable, versions);
  if (budget.exhausted) {
    return {
      canSubmit: false,
      reason: `You have used all ${budget.limit} drafts. Puzzle Media can grant another round.`,
    };
  }
  return { canSubmit: true, reason: null };
}

/**
 * Exhausting the cap moves the deliverable to `rejected`, which a super
 * admin can unlock by granting another round. Called after a
 * request-changes decision to decide whether the creator gets another turn.
 */
export function statusAfterChangesRequested(
  deliverable: Deliverable,
  versions: SubmissionVersion[],
): DeliverableStatus {
  return draftBudget(deliverable, versions).exhausted
    ? "rejected"
    : "changes_requested";
}

/* ── Ownership ──────────────────────────────────────────────────────── */

/**
 * Every workflow object must be able to answer "who is blocking this and
 * since when". This maps status to the party that owes the next action.
 */
export function ownerForStatus(status: DeliverableStatus): OwnerKind {
  switch (status) {
    case "not_started":
    case "in_production":
    case "changes_requested":
      return "creator";
    case "submitted":
    case "under_review":
      return "reviewer";
    case "live_link_submitted":
      return "puzzle_media";
    case "blocked":
      return "system";
    case "approved":
    case "rejected":
    case "link_verified":
      return "system";
    default:
      return "system";
  }
}

export const DELIVERABLE_LABEL: Record<DeliverableStatus, string> = {
  not_started: "Not started",
  blocked: "Locked",
  in_production: "In production",
  submitted: "Submitted",
  under_review: "Under review",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
  live_link_submitted: "Link submitted",
  link_verified: "Link verified",
};

export const DELIVERABLE_TYPE_LABEL = {
  script: "Script",
  video: "Video",
  live_post: "Live post",
} as const;

/** Statuses where the creator owes the next action. */
export function isCreatorOwned(status: DeliverableStatus): boolean {
  return ownerForStatus(status) === "creator";
}
