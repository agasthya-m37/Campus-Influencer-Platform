import { CampaignDetailScreen } from "@/features/campaigns/campaign-detail-screen";

export default async function CampaignPage({ params }: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  return <CampaignDetailScreen campaignId={id} />;
}
