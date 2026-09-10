/**
 * Fixed product copy.
 *
 * F-DASH-04 fixes three earnings strings exactly, and forbids the phrase
 * "money generated" anywhere in the product. A rule that lives only in a PRD
 * gets violated by the third contributor; a rule with a constant and a CI
 * grep does not. Import from here rather than typing the strings inline.
 */

export const EARNINGS = {
  /** Never "Total earned", never "Money generated". */
  TOTAL: "Total Earnings",
  PENDING: "Pending Payment",
  PAID: "Paid Earnings",
} as const;

/**
 * No money moves in Phase 1. This is stated plainly wherever amounts appear,
 * so a creator never believes the app is going to pay them.
 */
export const EARNINGS_DISCLAIMER =
  "Payments are settled by Puzzle Media outside this app. Amounts here are a record, not a transaction.";

/** F-REP-08 — manual data must never be presented as API-verified. */
export const METRIC_SOURCE_LABEL = {
  api: "Auto-synced",
  creator_submitted: "You submitted",
  admin_verified: "Verified by Puzzle Media",
  manual_import: "Imported",
} as const;

export const METRIC_SOURCE_HELP = {
  api: "Pulled automatically from your connected account.",
  creator_submitted: "Entered by you, awaiting review by Puzzle Media.",
  admin_verified: "Checked and confirmed by Puzzle Media.",
  manual_import: "Loaded in bulk by Puzzle Media.",
} as const;

/** D13 — results are measured 7 days after publication. */
export const METRICS_WINDOW_DAYS = 7;

export const METRICS_PENDING_EXPLAINER = `Results are measured ${METRICS_WINDOW_DAYS} days after your post goes live, so the numbers settle before anyone reports on them.`;

/** F-SUB-12 / D5 — three drafts per deliverable, including the first. */
export const DRAFT_LIMIT_DEFAULT = 3;

/** Review is two-stage: Puzzle Media first, then the brand (D4). */
export const REVIEW_STAGE_LABEL = {
  puzzle_media: "Puzzle Media review",
  brand: "Brand review",
} as const;

export const REVIEW_STAGE_HELP = {
  puzzle_media: "Puzzle Media checks your work before the brand sees it.",
  brand: "The brand is reviewing. Puzzle Media has already approved this.",
} as const;

/** Ownership — the product must always answer "who is blocking this". */
export const OWNER_LABEL = {
  creator: "You",
  reviewer: "Reviewer",
  puzzle_media: "Puzzle Media",
  brand: "Brand",
  system: "System",
} as const;
