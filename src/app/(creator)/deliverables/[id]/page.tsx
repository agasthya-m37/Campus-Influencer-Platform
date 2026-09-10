import { DeliverableScreen } from "@/features/deliverables/deliverable-screen";

export default async function DeliverablePage({ params }: PageProps<"/deliverables/[id]">) {
  const { id } = await params;
  return <DeliverableScreen deliverableId={id} />;
}
