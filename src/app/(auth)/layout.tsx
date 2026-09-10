import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Centred, no chrome: signing in is the only thing on this screen. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="safe-top px-4 pt-6">
        <div className="mx-auto flex max-w-sm items-center gap-2">
          <span
            className="flex size-8 items-center justify-center rounded-md bg-primary font-display font-bold text-primary-foreground"
            aria-hidden
          >
            P
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Puzzle Campus
          </span>
        </div>
      </header>
      <main className="flex flex-1 items-center px-4 py-10">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
