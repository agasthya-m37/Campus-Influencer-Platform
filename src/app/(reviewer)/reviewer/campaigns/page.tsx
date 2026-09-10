import type { Metadata } from "next";
import { ReviewerCampaignsScreen } from "@/features/admin/admin-screens";
export const metadata: Metadata = { title: "Campaigns" };
export default function Page() { return <ReviewerCampaignsScreen />; }
