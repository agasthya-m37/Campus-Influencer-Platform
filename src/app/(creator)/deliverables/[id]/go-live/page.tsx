import { GoLiveScreen } from "@/features/deliverables/go-live-screen";
import { DELIVERABLE_IDS } from "@/lib/static-params";

export default async function GoLivePage({
  params,
}: PageProps<"/deliverables/[id]/go-live">) {
  const { id } = await params;
  return <GoLiveScreen deliverableId={id} />;
}

/** The static export pre-renders every seeded record. */
export function generateStaticParams() {
  return DELIVERABLE_IDS.map((id) => ({ id }));
}
