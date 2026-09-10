/**
 * The onboarding wizard's eight steps (F-ONB-01).
 *
 * Config-driven so the step order, fields and validation live in one place
 * rather than being spread across eight components. The step is carried in
 * the URL, so the back button works and a half-finished profile is
 * deep-linkable and resumable.
 *
 * F-ONB-08 / D3: there is deliberately no identity-document step. No college
 * ID, no Aadhaar, no PAN. Those move to Phase 2 with the payment work.
 */

import { z } from "zod";

export const STEP_IDS = [
  "identity",
  "college",
  "creator",
  "social",
  "preferences",
  "location",
  "consent",
  "preview",
] as const;

export type StepId = (typeof STEP_IDS)[number];

export interface StepConfig {
  id: StepId;
  title: string;
  description: string;
  schema: z.ZodType;
}

const phone = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number starting 6, 7, 8 or 9.");

export const STEPS: StepConfig[] = [
  {
    id: "identity",
    title: "About you",
    description: "The basics, so Puzzle Media knows who they are working with.",
    schema: z.object({
      display_name: z.string("Tell us your name.").min(2, "Tell us your name."),
      dob: z.string("Pick your date of birth.").min(1, "Pick your date of birth."),
      alternate_phone: z.union([phone, z.literal("")]).optional(),
    }),
  },
  {
    id: "college",
    title: "Your college",
    description: "Campaigns are often targeted by campus.",
    schema: z.object({
      college_id: z.string("Choose your college.").min(1, "Choose your college."),
      course: z.string("What are you studying?").min(2, "What are you studying?"),
      year: z.coerce.number("Which year are you in?").min(1, "Which year are you in?").max(6, "Which year are you in?"),
      grad_year: z.coerce.number("When do you graduate?").min(2024, "Enter a year from 2024 onwards.").max(2035, "Enter a year up to 2035."),
    }),
  },
  {
    id: "creator",
    title: "What you make",
    description: "So briefs land with the right people.",
    schema: z.object({
      bio: z.string("Write a short bio.").min(20, "A couple of sentences is plenty."),
      categories: z.array(z.string(), "Pick at least one.").min(1, "Pick at least one."),
      formats: z.array(z.string(), "Pick at least one.").min(1, "Pick at least one."),
    }),
  },
  {
    id: "social",
    title: "Your accounts",
    description:
      "Business and Creator accounts can share results automatically. Personal accounts cannot, so you would add numbers yourself.",
    schema: z.object({
      instagram_handle: z.string("Add your Instagram handle.").min(1, "Add your Instagram handle."),
      instagram_followers: z.coerce.number("Add your follower count.").min(0, "Follower count cannot be negative."),
      instagram_account_type: z.enum(["personal", "business", "creator"], "Choose your account type."),
      typical_views: z.coerce.number().min(0).optional(),
    }),
  },
  {
    id: "preferences",
    title: "Brands you like",
    description: "Optional, but it makes matching better.",
    schema: z.object({
      brand_preferences: z.array(z.string()).optional(),
      languages: z.array(z.string(), "Pick at least one language.").min(1, "Pick at least one language."),
    }),
  },
  {
    id: "location",
    title: "Where you are",
    description: "Some campaigns need creators in a particular city.",
    schema: z.object({
      city_id: z.string("Choose your city.").min(1, "Choose your city."),
      availability: z.string().optional(),
    }),
  },
  {
    id: "consent",
    title: "The agreements",
    description: "Four separate declarations. Each is recorded on its own.",
    // F-ONB-05: four separate consent records, not one lumped checkbox.
    schema: z.object({
      terms: z.literal(true, { message: "You need to accept the terms." }),
      privacy: z.literal(true, { message: "You need to accept the privacy policy." }),
      content_usage: z.literal(true, {
        message: "You need to allow your content to be used.",
      }),
      age_eligibility: z.literal(true, {
        message: "You need to confirm you are eligible.",
      }),
    }),
  },
  {
    id: "preview",
    title: "Check and submit",
    description: "Read it over. You can still change anything.",
    schema: z.object({}),
  },
];

export function stepIndex(id: string): number {
  return STEPS.findIndex((s) => s.id === id);
}

export function stepConfig(id: string): StepConfig | undefined {
  return STEPS.find((s) => s.id === id);
}

export function nextStep(id: string): StepId | null {
  const i = stepIndex(id);
  return i >= 0 && i < STEPS.length - 1 ? STEPS[i + 1].id : null;
}

export function prevStep(id: string): StepId | null {
  const i = stepIndex(id);
  return i > 0 ? STEPS[i - 1].id : null;
}

/**
 * The furthest step whose prerequisites are satisfied — where "resume"
 * should land someone who closed the app halfway through.
 */
export function resumeStep(values: Record<string, unknown>): StepId {
  for (const step of STEPS) {
    if (step.id === "preview") return "preview";
    const result = step.schema.safeParse(values);
    if (!result.success) return step.id;
  }
  return "preview";
}
