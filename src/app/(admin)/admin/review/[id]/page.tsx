import { ReviewScreen } from "@/features/reviewer/review-screen";

export default async function AdminReviewDetailPage({
  params,
}: PageProps<"/admin/review/[id]">) {
  const { id } = await params;
  return <ReviewScreen submissionId={id} basePath="/admin/review" />;
}
