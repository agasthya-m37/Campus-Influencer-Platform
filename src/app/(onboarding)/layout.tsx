import type { Viewport } from "next";

import { SessionProvider } from "@/features/auth/session";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

/** No bottom nav here: onboarding is a single linear task. */
export default function OnboardingLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionProvider>
      <div className="min-h-dvh bg-background">
        <header className="safe-top border-b bg-surface">
          <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-4">
            <span
              className="flex size-7 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground"
              aria-hidden
            >
              P
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              Puzzle Campus
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </div>
    </SessionProvider>
  );
}
