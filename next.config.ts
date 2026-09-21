import type { NextConfig } from "next";

/**
 * GitHub Pages serves static files from a subpath, so the production build
 * is a static export prefixed with the repository name. Local development is
 * unaffected: `output: "export"` only changes `next build`.
 */
const isPages = process.env.GITHUB_PAGES === "true";
const repo = "/Campus-Influencer-Platform";

const nextConfig: NextConfig = {
  /**
   * `unoptimized` images bypass the image loader, and with it the automatic
   * basePath prefixing, so their src must carry the prefix itself. Exposed
   * as a public env var because the components need it at runtime and
   * next.config is not importable from client code.
   */
  env: {
    NEXT_PUBLIC_BASE_PATH: isPages ? repo : "",
  },

  ...(isPages
    ? {
        output: "export",
        basePath: repo,
        assetPrefix: repo,
        // Pages has no image optimiser, and the logos are already sized.
        images: { unoptimized: true },
        // Pages resolves /path as /path/index.html, so emit directories.
        trailingSlash: true,
      }
    : {}),

  /**
   * The dev indicator defaults to bottom-left, where it sits on top of the
   * creator portal's bottom navigation. Moved so mobile QA sees the real UI.
   */
  devIndicators: {
    position: "top-right",
  },
};

export default nextConfig;
