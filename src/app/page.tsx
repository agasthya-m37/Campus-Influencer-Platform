"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Route groups mean there is no page at "/", so this resolves the landing
 * screen. The demo has no real session, so it lands on sign-in rather than
 * assuming a logged-in creator.
 *
 * A client-side redirect, not next/navigation's server-side `redirect()`:
 * this app is a static export (`output: "export"`, see next.config.ts) with
 * no server at request time, so a server redirect has nothing to run it and
 * instead ships a broken "__next_error__" page as the literal response for
 * "/". `router.replace` on mount works the same in `next dev` and in the
 * static export.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}
