import type { Viewport } from "next";
import Link from "next/link";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Two panels on desktop, one on mobile.
 *
 * The lime panel is the brand's loudest surface and it is doing real work
 * here: it is the only thing on the page that is unmistakably Puzzle Media,
 * and it carries the pitch so the form itself can stay quiet. Below lg it is
 * dropped entirely rather than stacked, because a 200px band of marketing
 * above a login form on a phone is just something to scroll past.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="no-grid relative hidden overflow-hidden border-r-[1.5px] border-ink bg-lime lg:flex lg:flex-col lg:justify-between lg:p-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <span
            className="flex size-9 items-center justify-center rounded-md border-[1.5px] border-ink bg-card font-display text-lg text-foreground"
            aria-hidden
          >
            P
          </span>
          <span className="font-display text-base tracking-tight text-ink">
            Puzzle&nbsp;Media
          </span>
        </Link>

        <div className="max-w-md">
          <h2 className="font-display text-display leading-[0.95] text-ink">
            Your influence
            <br />
            is your currency.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/75">
            Pick the collaborations you want, make the content your way, and
            watch what it earns. All in one place.
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-3">
            {[
              { value: "500+", label: "brands" },
              { value: "48h", label: "to go live" },
              { value: "₹", label: "paid per post" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-md border-[1.5px] border-ink bg-card px-3 py-2.5 shadow-sm"
              >
                <dt className="font-display text-xl tabular text-foreground">
                  {stat.value}
                </dt>
                <dd className="mt-0.5 text-caption text-muted-foreground">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-caption text-ink/60">
          © {new Date().getFullYear()} Puzzle Media
        </p>
      </aside>

      <main className="flex min-h-dvh flex-col">
        {/* Mobile-only brand mark; the lime panel covers this on desktop. */}
        <header className="safe-top px-5 pt-6 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-md border-[1.5px] border-ink bg-lime font-display text-lg text-ink"
              aria-hidden
            >
              P
            </span>
            <span className="font-display text-base tracking-tight">
              Puzzle&nbsp;Media
            </span>
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-10 lg:px-12">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
      </main>
    </div>
  );
}
