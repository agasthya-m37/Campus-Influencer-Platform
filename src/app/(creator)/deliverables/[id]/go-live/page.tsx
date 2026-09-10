import { GoLiveScreen } from "@/features/deliverables/go-live-screen";

export default async function GoLivePage({
  params,
}: PageProps<"/deliverables/[id]/go-live">) {
  const { id } = await params;
  return <GoLiveScreen deliverableId={id} />;
}
