import type { Viewport } from "next";

import { CreatorShell } from "@/features/shell/creator-shell";
import { SessionProvider } from "@/features/auth/session";

/**
 * The creator portal is the PWA surface: installable, app-like, mobile
 * first. Its viewport differs from the desktop portals, which is the
 * concrete reason these are separate route groups.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#131211" },
  ],
};

export default function CreatorLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionProvider>
      <CreatorShell>{children}</CreatorShell>
    </SessionProvider>
  );
}
