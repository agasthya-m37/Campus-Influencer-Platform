"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

export function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [hint, setHint] = useState<string | null>(null);

  const request = useMutation(
    (input: string, key: string) =>
      api.auth.requestOtp(`+91${input}`, { idempotencyKey: key }),
    {
      onSuccess: (result) => {
        setStage("code");
        setHint(result.hint);
      },
      onError: (e) => toast.error(messageFor(e)),
    },
  );

  const isValidPhone = /^[6-9]\d{9}$/.test(phone);

  if (stage === "code") {
    return (
      <VerifyStep
        phone={phone}
        hint={hint}
        onBack={() => setStage("phone")}
        onVerified={(needsOnboarding) =>
          router.push(needsOnboarding ? "/onboarding/identity" : "/home")
        }
        onResend={() => request.mutate(phone)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-display leading-none">Sign in</h1>
        <p className="mt-2 text-muted-foreground">
          We will text you a six-digit code.
        </p>
      </header>

      <div className="space-y-2">
        <Label htmlFor="phone">Mobile number</Label>
        <div className="flex items-stretch">
          <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 font-mono text-sm text-muted-foreground">
            +91
          </span>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            className="rounded-l-none font-mono tabular"
            placeholder="98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            aria-describedby="phone-help"
            aria-invalid={request.fieldErrors?.phone ? true : undefined}
          />
        </div>
        <p
          id="phone-help"
          className={cn(
            "text-sm",
            request.fieldErrors?.phone
              ? "text-status-danger-fg"
              : "text-muted-foreground",
          )}
        >
          {request.fieldErrors?.phone ?? "The number you use on WhatsApp works best."}
        </p>
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={!isValidPhone || request.isPending}
        onClick={() => request.mutate(phone)}
      >
        {request.isPending ? "Sending…" : "Send code"}
        <ArrowRight className="size-4" aria-hidden />
      </Button>

      <p className="text-caption text-muted-foreground">
        By continuing you agree to Puzzle Media contacting you about campaigns.
      </p>
    </div>
  );
}

function VerifyStep({
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
    const focusAt = Math.min(index + chars.length, OTP_LENGTH - 1);
    inputs.current[focusAt]?.focus();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-h1">Enter the code</h1>
        <p className="mt-2 text-muted-foreground">
          Sent to +91 {phone}.{" "}
          <button
            type="button"
            onClick={onBack}
            className="text-primary underline underline-offset-2"
          >
            Change
          </button>
        </p>
      </header>

      <div className="space-y-2">
        <Label htmlFor="otp-0">Six-digit code</Label>
        <div className="flex gap-2" role="group" aria-label="Six-digit code">
          {digits.map((digit, index) => (
            <Input
              key={index}
              id={`otp-${index}`}
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
              className="h-14 flex-1 p-0 text-center font-mono text-lg tabular"
            />
          ))}
        </div>
      </div>

      {hint && (
        <p className="rounded-md border border-dashed bg-surface-sunken p-3 text-sm text-muted-foreground">
          Demo build: the code is{" "}
          <span className="font-mono font-medium">{hint}</span>.
        </p>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={code.length !== OTP_LENGTH || verify.isPending}
        onClick={() => verify.mutate(code)}
      >
        {verify.isPending ? "Checking…" : "Continue"}
      </Button>

      <div className="text-center">
        {secondsLeft > 0 ? (
          <p className="text-sm text-muted-foreground">
            Resend in <span className="font-mono tabular">{secondsLeft}s</span>
          </p>
        ) : (
          <Button
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
    </div>
  );
}
