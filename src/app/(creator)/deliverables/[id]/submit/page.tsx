import { SubmitScreen } from "@/features/deliverables/submit-screen";
import { DELIVERABLE_IDS } from "@/lib/static-params";

export default async function SubmitPage({ params }: PageProps<"/deliverables/[id]/submit">) {
  const { id } = await params;
  return <SubmitScreen deliverableId={id} />;
}

/** The static export pre-renders every seeded record. */
export function generateStaticParams() {
  return DELIVERABLE_IDS.map((id) => ({ id }));
}
