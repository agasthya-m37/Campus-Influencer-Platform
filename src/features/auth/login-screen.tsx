"use client";

import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

type Method = "password" | "otp";

/**
 * Sign-in with two paths.
 *
 * Email and password is primary because that is what the backend's auth_user
 * model holds. Mobile OTP stays alongside it: a first-year student may not
 * have set a password yet, and the number they use on WhatsApp is the one
 * credential they always have on them.
 */
export function LoginScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("password");

  function land(needsOnboarding: boolean) {
    router.push(needsOnboarding ? "/onboarding/identity" : "/home");
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="text-caption font-semibold tracking-[0.18em] uppercase text-muted-foreground">
          Creator sign in
        </p>
        <h1 className="mt-2 font-display text-h1 leading-[1.05]">
          Welcome back.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick up where your campaigns left off.
        </p>
      </header>

      <MethodToggle value={method} onChange={setMethod} />

      {method === "password" ? (
        <PasswordForm onSignedIn={land} />
      ) : (
        <OtpFlow onSignedIn={land} />
      )}

      <p className="border-t-[1.5px] border-dashed border-border pt-5 text-caption leading-relaxed text-muted-foreground">
        New here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary underline underline-offset-2"
        >
          Create your creator account
        </Link>
        .
      </p>
    </div>
  );
}

/* ── method toggle ──────────────────────────────────────────────────── */

function MethodToggle({
  value,
  onChange,
}: {
  value: Method;
  onChange: (next: Method) => void;
}) {
  const options: Array<{ id: Method; label: string }> = [
    { id: "password", label: "Email" },
    { id: "otp", label: "Mobile OTP" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Sign-in method"
      className="grid grid-cols-2 gap-1.5 rounded-full border-[1.5px] border-ink bg-surface-sunken p-1.5"
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "h-10 rounded-full text-sm font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── email and password ─────────────────────────────────────────────── */

function PasswordForm({
  onSignedIn,
}: {
  onSignedIn: (needsOnboarding: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const emailId = useId();
  const passwordId = useId();

  const login = useMutation(
    (input: { email: string; password: string }, key: string) =>
      api.auth.login(input.email, input.password, { idempotencyKey: key }),
    {
      onSuccess: (result) => onSignedIn(result.needsOnboarding),
      onError: (e) => {
        // Field errors render inline; only surface a toast for the rest,
        // otherwise a wrong password shouts the same thing twice.
        if (!e.fields) toast.error(messageFor(e));
      },
    },
  );

  const forgot = useMutation(
    (input: string) => api.auth.forgotPassword(input),
    {
      onSuccess: () =>
        toast.success("If that email has an account, a reset link is on its way."),
      onError: (e) => toast.error(messageFor(e)),
    },
  );

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) login.mutate({ email, password });
      }}
      className="space-y-5"
    >
      <Field
        id={emailId}
        label="Email"
        error={login.fieldErrors?.email}
        help="The address you signed up with."
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
          aria-invalid={login.fieldErrors?.email ? true : undefined}
        />
      </Field>

      <Field
        id={passwordId}
        label="Password"
        error={login.fieldErrors?.password}
        action={
          <button
            type="button"
            onClick={() => {
              if (!email.trim()) {
                toast.error("Type your email first, then tap Forgot.");
                return;
              }
              forgot.mutate(email);
            }}
            className="text-caption font-semibold text-primary underline-offset-2 hover:underline"
          >
            Forgot?
          </button>
        }
      >
        <div className="relative">
          <Input
            id={passwordId}
            type={reveal ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={login.fieldErrors?.password ? true : undefined}
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
      </Field>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!canSubmit || login.isPending}
      >
        {login.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="size-4" aria-hidden />
          </>
        )}
      </Button>

      <DemoHint />
    </form>
  );
}

/* ── mobile OTP ─────────────────────────────────────────────────────── */

function OtpFlow({
  onSignedIn,
}: {
  onSignedIn: (needsOnboarding: boolean) => void;
}) {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const phoneId = useId();

  const request = useMutation(
    (input: string, key: string) =>
      api.auth.requestOtp(`+91${input}`, { idempotencyKey: key }),
    {
      onSuccess: (result) => {
        setSent(true);
        setHint(result.hint);
      },
      onError: (e) => {
        if (!e.fields) toast.error(messageFor(e));
      },
    },
  );

  const isValid = /^[6-9]\d{9}$/.test(phone);

  if (sent) {
    return (
      <OtpVerify
        phone={phone}
        hint={hint}
        onBack={() => setSent(false)}
        onVerified={onSignedIn}
        onResend={() => request.mutate(phone)}
      />
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) request.mutate(phone);
      }}
      className="space-y-5"
    >
      <Field
        id={phoneId}
        label="Mobile number"
        error={request.fieldErrors?.phone}
        help="We text a six-digit code. Standard rates apply."
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
            aria-invalid={request.fieldErrors?.phone ? true : undefined}
          />
        </div>
      </Field>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isValid || request.isPending}
      >
        {request.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          <>
            Send code
            <ArrowRight className="size-4" aria-hidden />
          </>
        )}
      </Button>
    </form>
  );
}

function OtpVerify({
  phone,
  hint,
  onBack,
  onVerified,
  onResend,
}: {
  phone: string;
  hint: string | null;
  onBack: () => void;
  onVerified: (needsOnboarding: boolean) => void;
  onResend: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const verify = useMutation(
    (code: string, key: string) =>
      api.auth.verifyOtp(`+91${phone}`, code, { idempotencyKey: key }),
    {
      onSuccess: (result) => onVerified(result.needsOnboarding),
      onError: (e) => {
        toast.error(messageFor(e));
        setDigits(Array(OTP_LENGTH).fill(""));
        inputs.current[0]?.focus();
      },
    },
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const code = digits.join("");

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((prev) => prev.map((d, i) => (i === index ? "" : d)));
      return;
    }
    // Handles paste of a whole code into any box.
    const chars = clean.split("");
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < chars.length && index + i < OTP_LENGTH; i += 1) {
        next[index + i] = chars[i];
      }
      return next;
    });
    inputs.current[Math.min(index + chars.length, OTP_LENGTH - 1)]?.focus();
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === OTP_LENGTH) verify.mutate(code);
      }}
      className="space-y-5"
    >
      <div>
        <p className="text-sm text-muted-foreground">
          Code sent to{" "}
          <span className="font-semibold text-foreground tabular">
            +91 {phone}
          </span>
          .{" "}
          <button
            type="button"
            onClick={onBack}
            className="font-semibold text-primary underline underline-offset-2"
          >
            Change
          </button>
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Six-digit code</legend>
        <div className="flex gap-2">
          {digits.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              // Lets iOS and Android offer the SMS code automatically.
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={OTP_LENGTH}
              value={digit}
              aria-label={`Digit ${index + 1}`}
              onChange={(e) => setDigit(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digit && index > 0) {
                  inputs.current[index - 1]?.focus();
                }
              }}
              className="h-14 flex-1 p-0 text-center font-display text-lg tabular"
            />
          ))}
        </div>
      </fieldset>

      {hint && (
        <p className="rounded-md border-[1.5px] border-dashed border-border bg-surface-sunken px-3.5 py-3 text-caption text-muted-foreground">
          Demo build — the code is{" "}
          <span className="font-semibold text-foreground">{hint}</span>.
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={code.length !== OTP_LENGTH || verify.isPending}
      >
        {verify.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Checking…
          </>
        ) : (
          "Continue"
        )}
      </Button>

      <div className="text-center">
        {secondsLeft > 0 ? (
          <p className="text-caption text-muted-foreground">
            Resend in <span className="tabular">{secondsLeft}s</span>
          </p>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onResend();
              setSecondsLeft(RESEND_SECONDS);
            }}
          >
            Send a new code
          </Button>
        )}
      </div>
    </form>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────── */

function Field({
  id,
  label,
  error,
  help,
  action,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  help?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
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

/**
 * The demo build has no real accounts, so the credentials are on screen.
 * This block is the one thing on the page that must not survive to
 * production; it is keyed off NODE_ENV so it cannot.
 */
function DemoHint() {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="rounded-md border-[1.5px] border-dashed border-border bg-surface-sunken px-3.5 py-3">
      <p className="text-caption font-semibold text-foreground">Demo accounts</p>
      <ul className="mt-1.5 space-y-0.5 text-caption text-muted-foreground">
        <li>
          Creator — <span className="text-foreground">ananya.rao@example.in</span>
        </li>
        <li>
          Brand — <span className="text-foreground">marketing@zenfit.in</span>
        </li>
        <li>
          Puzzle Media — <span className="text-foreground">admin@puzzlemedia.in</span>
        </li>
        <li className="pt-1">
          Password — <span className="text-foreground">puzzle1234</span>
        </li>
      </ul>
    </div>
  );
}
