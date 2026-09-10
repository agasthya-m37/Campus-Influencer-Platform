import type { Metadata } from "next";

import { ReviewQueueScreen } from "@/features/reviewer/queue-screen";

export const metadata: Metadata = { title: "Review queue" };

export default function QueuePage() {
  return <ReviewQueueScreen />;
}
