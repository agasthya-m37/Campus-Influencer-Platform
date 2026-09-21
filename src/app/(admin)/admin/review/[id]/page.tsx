import { ReviewScreen } from "@/features/reviewer/review-screen";
import { SUBMISSION_IDS } from "@/lib/static-params";

export default async function AdminReviewDetailPage({
  params,
}: PageProps<"/admin/review/[id]">) {
  const { id } = await params;
  return <ReviewScreen submissionId={id} basePath="/admin/review" />;
}

/** The static export pre-renders every seeded record. */
export function generateStaticParams() {
  return SUBMISSION_IDS.map((id) => ({ id }));
}
