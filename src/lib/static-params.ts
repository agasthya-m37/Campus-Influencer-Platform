/**
 * Ids the static export pre-renders.
 *
 * A static build has no server, so every dynamic route must be listed ahead
 * of time. These mirror the seeded fixtures: the demo only ever links to
 * these records, so pre-rendering them covers every reachable page.
 *
 * When the seed grows, this list grows with it. Kept in one file rather than
 * duplicated across seven route files so they cannot drift apart.
 */

export const CAMPAIGN_IDS = [
  "cmp_001",
  "cmp_002",
  "cmp_003",
  "cmp_004",
  "cmp_005",
] as const;

export const DELIVERABLE_IDS = [
  "dlv_001",
  "dlv_002",
  "dlv_003",
  "dlv_004",
  "dlv_005",
  "dlv_006",
  "dlv_007",
  "dlv_008",
  "dlv_009",
  "dlv_010",
  "dlv_011",
  "dlv_012",
] as const;

export const SUBMISSION_IDS = ["sub_001", "sub_002"] as const;

export const ONBOARDING_STEPS = [
  "identity",
  "college",
  "creator",
  "social",
  "preferences",
  "location",
  "consent",
  "preview",
] as const;
