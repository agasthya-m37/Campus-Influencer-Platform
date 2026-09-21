import { CampaignDetailScreen } from "@/features/campaigns/campaign-detail-screen";
import { CAMPAIGN_IDS } from "@/lib/static-params";

export default async function CampaignPage({ params }: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  return <CampaignDetailScreen campaignId={id} />;
}

/** The static export pre-renders every seeded record. */
export function generateStaticParams() {
  return CAMPAIGN_IDS.map((id) => ({ id }));
}
