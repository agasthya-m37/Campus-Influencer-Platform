import { ReviewScreen } from "@/features/reviewer/review-screen";
import { SUBMISSION_IDS } from "@/lib/static-params";

export default async function ReviewPage({
  params,
}: PageProps<"/reviewer/submissions/[id]">) {
  const { id } = await params;
  return <ReviewScreen submissionId={id} />;
}

/** The static export pre-renders every seeded record. */
export function generateStaticParams() {
  return SUBMISSION_IDS.map((id) => ({ id }));
}
