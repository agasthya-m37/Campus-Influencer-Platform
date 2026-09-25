import { seedDatabase } from "@/lib/api/mock/seed";

/**
 * Ids the static export pre-renders.
 *
 * A static build has no server, so every dynamic route must be listed ahead
 * of time. Derived directly from the seed itself (not hand-copied into a
 * parallel list) so adding a campaign/deliverable/submission to the seed can
 * never silently leave its detail page un-prerendered — that drift is
 * exactly what caused a run of 404s on campaigns and deliverables added
 * after this file was first written by hand.
 */
const seed = seedDatabase();

export const CAMPAIGN_IDS = seed.campaigns.map((c) => c.id);

export const DELIVERABLE_IDS = seed.deliverables.map((d) => d.id);

export const SUBMISSION_IDS = seed.submissionVersions.map((s) => s.id);

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
