/**
 * Two-stage review (D4 / F-SUB-16).
 *
 * Puzzle Media reviews first so the brand never sees unchecked work. The
 * brand's SLA clock starts only when Puzzle Media releases the submission to
 * them — not when the creator submitted. Order is a configurable property of
 * the campaign from day one, because Puzzle Media intends to hand review to
 * brands as they scale and hardcoding it now makes that a rebuild.
 */

import type {
  Campaign,
  Deliverable,
  DeliverableStatus,
  ReviewDecision,
  ReviewStage,
  RejectReasonCode,
  Review,
  SubmissionVersion,
} from "@/lib/types";
import { statusAfterChangesRequested } from "@/lib/domain/deliverables";

/** The ordered review chain for a campaign. */
export function reviewChain(campaign: Campaign): ReviewStage[] {
  switch (campaign.review_order) {
    case "puzzle_then_brand":
      return ["puzzle_media", "brand"];
    case "brand_only":
      return ["brand"];
    case "puzzle_only":
      return ["puzzle_media"];
  }
}

/**
 * Which stage a submission currently sits with, given the reviews already
 * recorded against it. Returns null when the chain is complete.
 */
export function currentStage(
  campaign: Campaign,
  reviews: Review[],
): ReviewStage | null {
  const chain = reviewChain(campaign);
  const approvedStages = new Set(
    reviews.filter((r) => r.decision === "approve").map((r) => r.stage),
  );
  return chain.find((stage) => !approvedStages.has(stage)) ?? null;
}

/** Whether the chain has been fully approved. */
export function isFullyApproved(
  campaign: Campaign,
  reviews: Review[],
): boolean {
  return currentStage(campaign, reviews) === null && reviews.length > 0;
}

/**
 * A submission at Puzzle Media review is invisible to the brand. This is the
 * predicate the reviewer queue filters on, so a brand reviewer cannot see
 * work that has not been released to them.
 */
export function isVisibleToStage(
  campaign: Campaign,
  reviews: Review[],
  stage: ReviewStage,
): boolean {
  const chain = reviewChain(campaign);
  const index = chain.indexOf(stage);
  if (index === -1) return false;
  if (index === 0) return true;

  // Every earlier stage must have approved before this stage sees it.
  const approved = new Set(
    reviews.filter((r) => r.decision === "approve").map((r) => r.stage),
  );
  return chain.slice(0, index).every((s) => approved.has(s));
}

export interface DecisionInput {
  stage: ReviewStage;
  decision: ReviewDecision;
  feedback: string;
  reasonCode?: RejectReasonCode | null;
  internalNote?: string | null;
  /** Reviewer's explicit choice at reject time. */
  endsParticipation?: boolean;
}

export interface DecisionValidation {
  valid: boolean;
  errors: Partial<Record<"feedback" | "reasonCode", string>>;
}

/** F-SUB-08. Changes and reject both require real feedback, min 10 chars. */
export const MIN_FEEDBACK_LENGTH = 10;

export function validateDecision(input: DecisionInput): DecisionValidation {
  const errors: DecisionValidation["errors"] = {};

  if (input.decision !== "approve") {
    const trimmed = input.feedback.trim();
    if (trimmed.length < MIN_FEEDBACK_LENGTH) {
      errors.feedback = `Give the creator at least ${MIN_FEEDBACK_LENGTH} characters of specific feedback.`;
    }
  }
  if (input.decision === "reject" && !input.reasonCode) {
    errors.reasonCode = "Choose a reason for rejecting.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export interface DecisionOutcome {
  deliverableStatus: DeliverableStatus;
  /** Next stage to review, or null when the chain is complete. */
  nextStage: ReviewStage | null;
  /** True when this approval releases the work to the next reviewer. */
  releasedToNextStage: boolean;
  endsParticipation: boolean;
}

/**
 * What a decision does to the deliverable. Kept separate from the mutation
 * itself so the reviewer UI can preview the consequence before committing.
 */
export function applyDecision(
  campaign: Campaign,
  deliverable: Deliverable,
  versions: SubmissionVersion[],
  priorReviews: Review[],
  input: DecisionInput,
): DecisionOutcome {
  if (input.decision === "reject") {
    return {
      deliverableStatus: "rejected",
      nextStage: null,
      releasedToNextStage: false,
      endsParticipation: input.endsParticipation ?? false,
    };
  }

  if (input.decision === "request_changes") {
    return {
      deliverableStatus: statusAfterChangesRequested(deliverable, versions),
      nextStage: input.stage,
      releasedToNextStage: false,
      endsParticipation: false,
    };
  }

  // Approve: advance along the chain.
  const after = [...priorReviews, { stage: input.stage, decision: "approve" } as Review];
  const next = currentStage(campaign, after);

  return {
    deliverableStatus: next === null ? "approved" : "under_review",
    nextStage: next,
    releasedToNextStage: next !== null,
    endsParticipation: false,
  };
}

export const REJECT_REASON_LABEL: Record<RejectReasonCode, string> = {
  off_brief: "Does not follow the brief",
  quality: "Quality below standard",
  brand_safety: "Brand safety concern",
  guideline_breach: "Breaches platform guidelines",
  plagiarism: "Not original work",
  other: "Other",
};

export const DECISION_LABEL: Record<ReviewDecision, string> = {
  approve: "Approve",
  request_changes: "Request changes",
  reject: "Reject",
};
