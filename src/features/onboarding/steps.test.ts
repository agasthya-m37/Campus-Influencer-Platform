import { describe, expect, it } from "vitest";

import { STEPS, nextStep, prevStep, resumeStep, stepConfig } from "./steps";

/** Every message a creator can see must be human, never a Zod internal. */
function messagesFor(stepId: string, values: Record<string, unknown>) {
  const result = stepConfig(stepId)!.schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe("onboarding validation copy", () => {
  it("never leaks Zod's default messages on an empty step", () => {
    for (const step of STEPS) {
      for (const message of messagesFor(step.id, {})) {
        expect(message).not.toMatch(/Invalid input|expected .* received/i);
        // A real sentence, not a type description.
        expect(message.length).toBeGreaterThan(5);
      }
    }
  });

  it("asks for the name and date of birth by name", () => {
    const messages = messagesFor("identity", {});
    expect(messages).toContain("Tell us your name.");
    expect(messages).toContain("Pick your date of birth.");
  });

  it("accepts a complete identity step", () => {
    expect(
      messagesFor("identity", { display_name: "Priya Menon", dob: "2005-04-12" }),
    ).toEqual([]);
  });

  it("requires all four consents separately (F-ONB-05)", () => {
    const messages = messagesFor("consent", { terms: true, privacy: true });
    expect(messages).toHaveLength(2);
    expect(messages).toContain("You need to allow your content to be used.");
    expect(messages).toContain("You need to confirm you are eligible.");
  });
});

describe("onboarding navigation", () => {
  it("walks forward and back through eight steps", () => {
    expect(STEPS).toHaveLength(8);
    expect(nextStep("identity")).toBe("college");
    expect(prevStep("college")).toBe("identity");
    expect(prevStep("identity")).toBeNull();
    expect(nextStep("preview")).toBeNull();
  });

  it("resumes at the first incomplete step", () => {
    expect(resumeStep({})).toBe("identity");
    expect(resumeStep({ display_name: "Priya Menon", dob: "2005-04-12" })).toBe(
      "college",
    );
  });

  it("has no field for identity documents (F-ONB-08 / D3)", () => {
    // No college ID, Aadhaar, PAN, UPI or bank field exists anywhere in the
    // Phase 1 schema. This is a compliance boundary, not a preference.
    const serialised = JSON.stringify(
      STEPS.map((s) => ({ id: s.id, keys: Object.keys((s.schema as never as { shape?: object }).shape ?? {}) })),
    );
    expect(serialised).not.toMatch(/aadhaar|pan_|upi|bank|college_id_proof|id_card/i);
  });
});
