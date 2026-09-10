import type { Metadata } from "next";
import { AdminSlaScreen } from "@/features/admin/admin-screens";
export const metadata: Metadata = { title: "SLA queue" };
export default function Page() { return <AdminSlaScreen />; }
