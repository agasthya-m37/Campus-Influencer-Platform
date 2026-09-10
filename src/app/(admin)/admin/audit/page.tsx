import type { Metadata } from "next";
import { AdminAuditScreen } from "@/features/admin/admin-screens";
export const metadata: Metadata = { title: "Audit log" };
export default function Page() { return <AdminAuditScreen />; }
