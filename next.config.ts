import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The dev indicator defaults to bottom-left, where it sits on top of the
   * creator portal's bottom navigation. Moved so mobile QA sees the real UI.
   */
  devIndicators: {
    position: "top-right",
  },
};

export default nextConfig;
