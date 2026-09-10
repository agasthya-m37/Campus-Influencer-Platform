import type { Metadata } from "next";
import { AdminCreatorsScreen } from "@/features/admin/admin-screens";
export const metadata: Metadata = { title: "Creators" };
export default function Page() { return <AdminCreatorsScreen />; }
