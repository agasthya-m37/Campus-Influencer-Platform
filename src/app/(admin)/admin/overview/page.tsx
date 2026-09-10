import type { Metadata } from "next";
import { AdminOverviewScreen } from "@/features/admin/admin-screens";
export const metadata: Metadata = { title: "Overview" };
export default function Page() { return <AdminOverviewScreen />; }
