import Image from "next/image";

import { cn } from "@/lib/utils";

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
      src="/brand/logo.png"
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
      src="/brand/mark.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0", className)}
    />
  );
}
