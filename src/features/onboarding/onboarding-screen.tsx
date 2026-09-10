"use client";

import { ArrowLeft, ArrowRight, Check, Cloud, CloudOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Stepper, StepperRail } from "@/components/patterns/stepper";
import { CardSkeleton } from "@/components/patterns/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAutosave } from "@/hooks/use-autosave";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation, useQuery } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import {
  STEPS,
  nextStep,
  prevStep,
  resumeStep,
  stepConfig,
  stepIndex,
} from "@/features/onboarding/steps";

type Values = Record<string, unknown>;

const CATEGORIES = [
  { id: "cat_campus", label: "Campus life" },
  { id: "cat_tech", label: "Tech" },
  { id: "cat_fashion", label: "Fashion" },
  { id: "cat_food", label: "Food" },
  { id: "cat_fitness", label: "Fitness" },
  { id: "cat_finance", label: "Personal finance" },
];

const FORMATS = [
  { id: "reel", label: "Reels" },
  { id: "story", label: "Stories" },
  { id: "carousel", label: "Carousels" },
  { id: "longform", label: "Long-form video" },
];

const LANGUAGES = [
  { id: "lang_en", label: "English" },
  { id: "lang_hi", label: "Hindi" },
  { id: "lang_ta", label: "Tamil" },
  { id: "lang_te", label: "Telugu" },
  { id: "lang_kn", label: "Kannada" },
];

const COLLEGES = [
  { id: "clg_vit", label: "VIT Vellore" },
  { id: "clg_srcc", label: "SRCC, Delhi University" },
  { id: "clg_manipal", label: "Manipal Institute of Technology" },
  { id: "clg_christ", label: "Christ University" },
];

const CITIES = [
  { id: "city_blr", label: "Bengaluru" },
  { id: "city_del", label: "Delhi NCR" },
  { id: "city_mum", label: "Mumbai" },
  { id: "city_vlr", label: "Vellore" },
  { id: "city_pun", label: "Pune" },
];

const CONSENTS = [
  { id: "terms", label: "I accept the terms of use." },
  { id: "privacy", label: "I accept the privacy policy." },
  {
    id: "content_usage",
    label: "Puzzle Media and the brand may use the content I make for these campaigns.",
  },
  {
    id: "age_eligibility",
    label: "I am 18 or older and currently enrolled at the college I named.",
  },
];

export function OnboardingScreen({ step }: { step: string }) {
  const router = useRouter();
  const config = stepConfig(step);
  const index = stepIndex(step);

  const draftQuery = useQuery((signal) => api.me.getDraft({ signal }), []);

  /**
   * Local edits take over once the creator touches anything; until then the
   * saved draft is the source of truth. Derived during render rather than
   * copied in an effect, which would cascade an extra render on every load.
   */
  const [edits, setEdits] = useState<Values | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const values: Values = useMemo(
    () => edits ?? draftQuery.data?.values ?? {},
    [edits, draftQuery.data],
  );

  const autosave = useAutosave<Values>(
    useCallback((next: Values) => api.me.saveDraft(step, next), [step]),
  );

  const submit = useMutation((_: void, key: string) => api.me.submitProfile({ idempotencyKey: key }), {
    onSuccess: () => {
      toast.success("Sent for review. Puzzle Media usually replies within two days.");
      router.push("/home");
    },
    onError: (e) => toast.error(messageFor(e)),
  });

  const set = useCallback(
    (key: string, value: unknown) => {
      setEdits((prev) => {
        const base = prev ?? draftQuery.data?.values ?? {};
        const next = { ...base, [key]: value };
        autosave.schedule(next);
        return next;
      });
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [autosave, draftQuery.data],
  );

  const completed = useMemo(
    () =>
      STEPS.map((s, i) => (s.schema.safeParse(values).success ? i : -1)).filter(
        (i) => i >= 0 && i < index,
      ),
    [values, index],
  );

  if (!config) {
    return <p className="text-muted-foreground">That step does not exist.</p>;
  }
  if (draftQuery.isLoading) return <CardSkeleton rows={3} />;

  async function goNext() {
    const result = config!.schema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    // Flush before navigating, so nothing typed on this step is lost.
    await autosave.flush();
    const next = nextStep(step);
    if (next) router.push(`/onboarding/${next}`);
  }

  const previous = prevStep(step);

  return (
    <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[14rem_1fr]">
      <aside className="hidden lg:block">
        <StepperRail steps={STEPS} currentIndex={index} completedIndices={completed} />
      </aside>

      <div className="min-w-0 space-y-6">
        <Stepper
          steps={STEPS}
          currentIndex={index}
          completedIndices={completed}
          className="lg:hidden"
        />

        <header>
          <h1 className="font-display text-h1">{config.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
        </header>

        <SaveIndicator state={autosave.state} savedAt={autosave.savedAt} />

        <div className="space-y-5">
          {step === "identity" && (
            <>
              <Field label="Your name" error={errors.display_name} htmlFor="display_name">
                <Input
                  id="display_name"
                  value={(values.display_name as string) ?? ""}
                  onChange={(e) => set("display_name", e.target.value)}
                  autoComplete="name"
                />
              </Field>
              <Field label="Date of birth" error={errors.dob} htmlFor="dob">
                <Input
                  id="dob"
                  type="date"
                  value={(values.dob as string) ?? ""}
                  onChange={(e) => set("dob", e.target.value)}
                />
              </Field>
            </>
          )}

          {step === "college" && (
            <>
              <Field label="College" error={errors.college_id} htmlFor="college_id">
                <Select
                  value={(values.college_id as string) ?? ""}
                  onValueChange={(v) => set("college_id", v)}
                >
                  <SelectTrigger id="college_id">
                    <SelectValue placeholder="Choose your college" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Course" error={errors.course} htmlFor="course">
                <Input
                  id="course"
                  placeholder="B.Tech Computer Science"
                  value={(values.course as string) ?? ""}
                  onChange={(e) => set("course", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Year" error={errors.year} htmlFor="year">
                  <Input
                    id="year"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={6}
                    value={(values.year as string) ?? ""}
                    onChange={(e) => set("year", e.target.value)}
                  />
                </Field>
                <Field label="Graduating in" error={errors.grad_year} htmlFor="grad_year">
                  <Input
                    id="grad_year"
                    type="number"
                    inputMode="numeric"
                    placeholder="2027"
                    value={(values.grad_year as string) ?? ""}
                    onChange={(e) => set("grad_year", e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          {step === "creator" && (
            <>
              <Field label="A short bio" error={errors.bio} htmlFor="bio">
                <Textarea
                  id="bio"
                  rows={4}
                  placeholder="What do you post about?"
                  value={(values.bio as string) ?? ""}
                  onChange={(e) => set("bio", e.target.value)}
                />
              </Field>
              <ChipGroup
                label="What you cover"
                error={errors.categories}
                options={CATEGORIES}
                selected={(values.categories as string[]) ?? []}
                onChange={(next) => set("categories", next)}
              />
              <ChipGroup
                label="Formats you make"
                error={errors.formats}
                options={FORMATS}
                selected={(values.formats as string[]) ?? []}
                onChange={(next) => set("formats", next)}
              />
            </>
          )}

          {step === "social" && (
            <>
              <Field
                label="Instagram handle"
                error={errors.instagram_handle}
                htmlFor="instagram_handle"
              >
                <Input
                  id="instagram_handle"
                  placeholder="yourname"
                  value={(values.instagram_handle as string) ?? ""}
                  onChange={(e) => set("instagram_handle", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Followers"
                  error={errors.instagram_followers}
                  htmlFor="instagram_followers"
                >
                  <Input
                    id="instagram_followers"
                    type="number"
                    inputMode="numeric"
                    value={(values.instagram_followers as string) ?? ""}
                    onChange={(e) => set("instagram_followers", e.target.value)}
                  />
                </Field>
                <Field
                  label="Typical views"
                  error={errors.typical_views}
                  htmlFor="typical_views"
                >
                  <Input
                    id="typical_views"
                    type="number"
                    inputMode="numeric"
                    value={(values.typical_views as string) ?? ""}
                    onChange={(e) => set("typical_views", e.target.value)}
                  />
                </Field>
              </div>
              <Field
                label="Account type"
                error={errors.instagram_account_type}
                htmlFor="instagram_account_type"
                help="Check Instagram settings if you are not sure. This decides whether your results can sync automatically."
              >
                <Select
                  value={(values.instagram_account_type as string) ?? ""}
                  onValueChange={(v) => set("instagram_account_type", v)}
                >
                  <SelectTrigger id="instagram_account_type">
                    <SelectValue placeholder="Choose one" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="creator">Creator</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}

          {step === "preferences" && (
            <>
              <ChipGroup
                label="Languages you post in"
                error={errors.languages}
                options={LANGUAGES}
                selected={(values.languages as string[]) ?? []}
                onChange={(next) => set("languages", next)}
              />
              <ChipGroup
                label="Categories you would like to work with"
                options={CATEGORIES}
                selected={(values.brand_preferences as string[]) ?? []}
                onChange={(next) => set("brand_preferences", next)}
              />
            </>
          )}

          {step === "location" && (
            <>
              <Field label="City" error={errors.city_id} htmlFor="city_id">
                <Select
                  value={(values.city_id as string) ?? ""}
                  onValueChange={(v) => set("city_id", v)}
                >
                  <SelectTrigger id="city_id">
                    <SelectValue placeholder="Choose your city" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="When you are usually free"
                htmlFor="availability"
                error={errors.availability}
              >
                <Input
                  id="availability"
                  placeholder="Weekends and weekday evenings"
                  value={(values.availability as string) ?? ""}
                  onChange={(e) => set("availability", e.target.value)}
                />
              </Field>
            </>
          )}

          {step === "consent" && (
            <div className="space-y-4">
              {CONSENTS.map((consent) => (
                <div key={consent.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={consent.id}
                      checked={values[consent.id] === true}
                      onCheckedChange={(c) => set(consent.id, c === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor={consent.id} className="text-sm leading-snug font-normal">
                      {consent.label}
                    </Label>
                  </div>
                  {errors[consent.id] && (
                    <p className="mt-2 text-sm text-status-danger-fg">
                      {errors[consent.id]}
                    </p>
                  )}
                </div>
              ))}
              <p className="text-caption text-muted-foreground">
                Each of these is recorded separately, with the version you agreed to and
                the time you agreed.
              </p>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <Summary values={values} />
              <p className="text-sm text-muted-foreground">
                Puzzle Media reviews every application by hand. You will hear back
                either way.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t pt-4">
          {previous && (
            <Button
              variant="outline"
              onClick={async () => {
                await autosave.flush();
                router.push(`/onboarding/${previous}`);
              }}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          )}
          {step === "preview" ? (
            <Button
              className="flex-1"
              disabled={submit.isPending}
              onClick={() => submit.mutate()}
            >
              <Check className="size-4" aria-hidden />
              {submit.isPending ? "Sending…" : "Submit for review"}
            </Button>
          ) : (
            <Button className="flex-1" onClick={goNext}>
              Continue
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────── */

function SaveIndicator({
  state,
  savedAt,
}: {
  state: ReturnType<typeof useAutosave>["state"];
  savedAt: Date | null;
}) {
  if (state === "idle" && !savedAt) return null;

  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 text-caption",
        state === "error" ? "text-status-danger-fg" : "text-muted-foreground",
      )}
      aria-live="polite"
    >
      {state === "error" ? (
        <CloudOff className="size-3.5" aria-hidden />
      ) : (
        <Cloud className="size-3.5" aria-hidden />
      )}
      {state === "saving"
        ? "Saving…"
        : state === "error"
          ? "Could not save. We will try again."
          : "Saved. You can close this and come back."}
    </p>
  );
}

function Field({
  label,
  htmlFor,
  error,
  help,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-status-danger-fg">
          {error}
        </p>
      ) : help ? (
        <p className="text-sm text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onChange,
  error,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((id) => id !== option.id)
                    : [...selected, option.id],
                )
              }
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:border-primary/40",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-status-danger-fg">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function Summary({ values }: { values: Values }) {
  const labelFor = (list: Array<{ id: string; label: string }>, ids: string[] = []) =>
    ids.map((id) => list.find((x) => x.id === id)?.label ?? id).join(", ") || "—";

  const rows: Array<[string, string]> = [
    ["Name", (values.display_name as string) ?? "—"],
    ["College", labelFor(COLLEGES, values.college_id ? [values.college_id as string] : [])],
    ["Course", `${values.course ?? "—"}, year ${values.year ?? "—"}`],
    ["Instagram", values.instagram_handle ? `@${values.instagram_handle}` : "—"],
    ["Account type", (values.instagram_account_type as string) ?? "—"],
    ["Covers", labelFor(CATEGORIES, values.categories as string[])],
    ["Formats", labelFor(FORMATS, values.formats as string[])],
    ["Languages", labelFor(LANGUAGES, values.languages as string[])],
    ["City", labelFor(CITIES, values.city_id ? [values.city_id as string] : [])],
  ];

  return (
    <dl className="divide-y rounded-lg border bg-card">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-4 px-4 py-3">
          <dt className="w-32 shrink-0 text-sm text-muted-foreground">{label}</dt>
          <dd className="min-w-0 flex-1 text-sm capitalize">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export { resumeStep };
