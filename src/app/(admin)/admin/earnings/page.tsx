import type { Metadata } from "next";
import { AdminEarningsScreen } from "@/features/admin/admin-screens";
export const metadata: Metadata = { title: "Earnings" };
export default function Page() { return <AdminEarningsScreen />; }
