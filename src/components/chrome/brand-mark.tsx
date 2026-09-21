import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Both marks are `unoptimized`, which means Next serves the src verbatim
 * rather than routing it through the image loader — and the loader is what
 * normally applies basePath. On GitHub Pages the app is served from a
 * subpath, so these two srcs have to carry it themselves or they 404 at the
 * domain root. Empty in development, where there is no basePath.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * The Puzzle Media logo.
 *
 * Two forms, because the lockup does not survive being shrunk: the cube with
 * PUZZLE and MEDIA set into its faces is legible at 100px and up, while the
 * MEDIA row turns to mud in a 28px navigation bar. Nav bars therefore get the
 * cube alone, with the wordmark set beside it in type.
 *
 * `priority` is on for the auth pages because the logo is the largest thing
 * above the fold there, so it is the LCP element.
 */
export function BrandLockup({
  className,
  width = 200,
  priority = false,
}: {
  className?: string;
  width?: number;
  priority?: boolean;
}) {
  // The source artwork is 1043 × 900, so height follows from the width.
  const height = Math.round((width * 900) / 1043);

  return (
    <Image
      src={`${BASE}/brand/logo.png`}
      alt="Puzzle Media"
      width={width}
      height={height}
      priority={priority}
      unoptimized
      className={cn("h-auto", className)}
    />
  );
}

export function BrandGlyph({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src={`${BASE}/brand/mark.png`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0", className)}
    />
  );
}
