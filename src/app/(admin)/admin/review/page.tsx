import type { Metadata } from "next";

import { ReviewQueueScreen } from "@/features/reviewer/queue-screen";

export const metadata: Metadata = { title: "Content review" };

/**
 * Puzzle Media reviews from inside the admin console rather than a separate
 * portal. The queue is the same component the brand reviewer sees; the API
 * scopes it by the signed-in user's role.
 */
export default function AdminReviewPage() {
  return <ReviewQueueScreen basePath="/admin/review" />;
}
