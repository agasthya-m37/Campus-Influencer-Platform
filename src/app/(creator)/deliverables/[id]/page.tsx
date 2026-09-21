import { DeliverableScreen } from "@/features/deliverables/deliverable-screen";
import { DELIVERABLE_IDS } from "@/lib/static-params";

export default async function DeliverablePage({ params }: PageProps<"/deliverables/[id]">) {
  const { id } = await params;
  return <DeliverableScreen deliverableId={id} />;
}

/** The static export pre-renders every seeded record. */
export function generateStaticParams() {
  return DELIVERABLE_IDS.map((id) => ({ id }));
}
