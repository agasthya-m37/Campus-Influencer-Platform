"use client";

import { Moon, RotateCcw, Settings2, Sun, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { api } from "@/lib/api/client";
import {
  getScenarios,
  resetScenarios,
  setScenario,
  subscribeScenarios,
  type Scenarios,
} from "@/lib/api/mock/scenarios";
import { store } from "@/lib/api/mock/store";

/** Frozen so the server snapshot keeps a stable identity across renders. */
const SERVER_SCENARIOS: Scenarios = Object.freeze({
  networkError: false,
  conflict: false,
  validationError: false,
  uploadInterruption: false,
  infectedFile: false,
  slowNetwork: false,
});

const ROLES = [
  { id: "usr_creator", label: "Ananya (Creator)", href: "/home" },
  { id: "usr_pm", label: "Puzzle Media reviewer", href: "/reviewer/queue" },
  { id: "usr_brand", label: "Brand reviewer (ZenFit)", href: "/reviewer/queue" },
  { id: "usr_admin", label: "Super admin", href: "/admin/overview" },
];

const TOGGLES: Array<{ key: keyof Scenarios; label: string; help: string }> = [
  {
    key: "networkError",
    label: "Network failure",
    help: "Every request fails, so the offline and error states are reachable.",
  },
  {
    key: "slowNetwork",
    label: "Slow connection",
    help: "Adds two seconds to every request, the way a weak 4G cell would.",
  },
  {
    key: "validationError",
    label: "Validation failure",
    help: "Forms reject on submit, so field-level errors can be checked.",
  },
  {
    key: "conflict",
    label: "Conflict on write",
    help: "Mutations return 409, which is what a stale client would see.",
  },
  {
    key: "uploadInterruption",
    label: "Upload drops at 40%",
    help: "The chunk crossing 40% fails, so resume can be demonstrated.",
  },
  {
    key: "infectedFile",
    label: "File fails scanning",
    help: "Uploads come back quarantined and do not start the SLA clock.",
  },
];

/**
 * Development-only control panel.
 *
 * Two jobs: switch role without real auth so all three portals are walkable,
 * and turn unhappy paths into a single click so they actually get looked at.
 */
export function DevBar() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  /**
   * Scenario flags live in localStorage, which the server cannot read. The
   * third argument is the server snapshot: without it the badge renders on
   * the client and not on the server, and every page carrying this bar
   * reports a hydration mismatch.
   */
  const scenarios = useSyncExternalStore(
    subscribeScenarios,
    getScenarios,
    () => SERVER_SCENARIOS,
  );
  const [mounted, setMounted] = useState(false);

  // Deferred so the theme label matches after hydration without a flash.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (process.env.NODE_ENV === "production") return null;

  const activeCount = Object.values(scenarios).filter(Boolean).length;

  async function switchTo(userId: string, href: string) {
    await api.auth.switchUser(userId);
    router.push(href);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Developer tools"
          className="fixed right-3 bottom-20 z-50 flex size-11 items-center justify-center rounded-full border bg-surface shadow-md transition-transform hover:scale-105 md:bottom-4"
        >
          <Settings2 className="size-4" aria-hidden />
          {activeCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-energy text-[10px] font-semibold text-background tabular"
              aria-hidden
            >
              {activeCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Developer tools</SheetTitle>
          <SheetDescription>
            Not shipped to production. Switch role, force failures, reset the demo data.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4" aria-hidden />
              Sign in as
            </h3>
            <div className="grid gap-2">
              {ROLES.map((role) => (
                <Button
                  key={role.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => switchTo(role.id, role.href)}
                >
                  {role.label}
                </Button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Failure scenarios</h3>
            <div className="space-y-3">
              {TOGGLES.map((toggle) => (
                <div key={toggle.key} className="flex items-start gap-3">
                  <input
                    id={`scenario-${toggle.key}`}
                    type="checkbox"
                    checked={scenarios[toggle.key]}
                    onChange={(e) => setScenario(toggle.key, e.target.checked)}
                    className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <div className="min-w-0">
                    <Label
                      htmlFor={`scenario-${toggle.key}`}
                      className="text-sm font-medium"
                    >
                      {toggle.label}
                    </Label>
                    <p className="text-caption text-muted-foreground">{toggle.help}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Reset</h3>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                resetScenarios();
                store.reset();
                router.refresh();
              }}
            >
              <RotateCcw className="size-4" aria-hidden />
              Reset demo data and scenarios
            </Button>
            {mounted && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="size-4" aria-hidden />
                ) : (
                  <Moon className="size-4" aria-hidden />
                )}
                Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
              </Button>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
