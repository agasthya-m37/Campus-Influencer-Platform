import { ReviewScreen } from "@/features/reviewer/review-screen";

export default async function ReviewPage({
  params,
}: PageProps<"/reviewer/submissions/[id]">) {
  const { id } = await params;
  return <ReviewScreen submissionId={id} />;
}
