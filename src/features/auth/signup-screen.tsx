"use client";

import { ArrowRight, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

/**
 * Create a creator account.
 *
 * Deliberately short. This screen exists to get somebody through the door,
 * not to collect a profile — the eight-step wizard does that immediately
 * afterwards, and asking for college and categories here would mean asking
 * twice. Four fields, all of them things the account genuinely cannot exist
 * without.
 */
export function SignupScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);

  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const passwordId = useId();

  const signup = useMutation(
    (
      input: { fullName: string; email: string; phone: string; password: string },
      key: string,
    ) => api.auth.signup(input, { idempotencyKey: key }),
    {
      onSuccess: () => {
        toast.success("Account created. Let's finish your profile.");
        router.push("/onboarding/identity");
      },
      onError: (e) => {
        if (!e.fields) toast.error(messageFor(e));
      },
    },
  );

  const rules = passwordRules(password);
  const passwordOk = rules.every((r) => r.met);
  const canSubmit =
    fullName.trim().length >= 2 &&
    email.trim().length > 0 &&
    /^[6-9]\d{9}$/.test(phone) &&
    passwordOk;

  return (
    <div className="space-y-7">
      <header>
        <p className="text-caption font-semibold tracking-[0.18em] uppercase text-muted-foreground">
          Join Puzzle Media
        </p>
        <h1 className="mt-2 font-display text-h1 leading-[1.05]">
          Create your account.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Takes a minute. You will finish your profile next.
        </p>
      </header>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) signup.mutate({ fullName, email, phone, password });
        }}
        className="space-y-5"
      >
        <Field id={nameId} label="Your name" error={signup.fieldErrors?.fullName}>
          <Input
            id={nameId}
            autoComplete="name"
            placeholder="Ananya Rao"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={signup.fieldErrors?.fullName ? true : undefined}
          />
        </Field>

        <Field
          id={emailId}
          label="Email"
          error={signup.fieldErrors?.email}
          help="Campaign updates and your sign-in go here."
        >
          <Input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={signup.fieldErrors?.email ? true : undefined}
          />
        </Field>

        <Field
          id={phoneId}
          label="Mobile number"
          error={signup.fieldErrors?.phone}
          help="The number you use on WhatsApp works best."
        >
          <div className="flex items-stretch">
            <span className="flex items-center rounded-l-md border-[1.5px] border-r-0 border-input bg-surface-sunken px-3.5 text-sm font-semibold text-muted-foreground">
              +91
            </span>
            <Input
              id={phoneId}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              className="rounded-l-none tabular"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              aria-invalid={signup.fieldErrors?.phone ? true : undefined}
            />
          </div>
        </Field>

        <Field id={passwordId} label="Password" error={signup.fieldErrors?.password}>
          <div className="relative">
            <Input
              id={passwordId}
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={signup.fieldErrors?.password ? true : undefined}
              aria-describedby={`${passwordId}-rules`}
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              aria-label={reveal ? "Hide password" : "Show password"}
              aria-pressed={reveal}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              {reveal ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>

          {/* Shown as you type rather than only on failure, so nobody has to
              guess what the form wants after being rejected. */}
          {password.length > 0 && (
            <ul id={`${passwordId}-rules`} className="mt-2 space-y-1">
              {rules.map((rule) => (
                <li
                  key={rule.label}
                  className={cn(
                    "flex items-center gap-1.5 text-caption",
                    rule.met ? "text-status-success-fg" : "text-muted-foreground",
                  )}
                >
                  <Check
                    className={cn("size-3", rule.met ? "opacity-100" : "opacity-30")}
                    aria-hidden
                  />
                  {rule.label}
                </li>
              ))}
            </ul>
          )}
        </Field>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canSubmit || signup.isPending}
        >
          {signup.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Creating…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>

        <p className="text-caption leading-relaxed text-muted-foreground">
          You will agree to the terms, privacy policy and content-usage
          declarations on the last step, before anything is submitted.
        </p>
      </form>

      <p className="border-t-[1.5px] border-dashed border-border pt-5 text-caption text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline underline-offset-2"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────── */

function passwordRules(value: string) {
  return [
    { label: "At least 8 characters", met: value.length >= 8 },
    { label: "A letter and a number", met: /[a-z]/i.test(value) && /\d/.test(value) },
  ];
}

function Field({
  id,
  label,
  error,
  help,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-caption font-medium text-status-danger-fg">
          {error}
        </p>
      ) : help ? (
        <p className="text-caption text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}
