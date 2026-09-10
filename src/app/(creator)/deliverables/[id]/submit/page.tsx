import { SubmitScreen } from "@/features/deliverables/submit-screen";

export default async function SubmitPage({ params }: PageProps<"/deliverables/[id]/submit">) {
  const { id } = await params;
  return <SubmitScreen deliverableId={id} />;
}
