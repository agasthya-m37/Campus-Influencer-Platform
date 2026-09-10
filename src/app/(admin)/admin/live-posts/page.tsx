import type { Metadata } from "next";
import { AdminLivePostsScreen } from "@/features/admin/admin-screens";
export const metadata: Metadata = { title: "Live links" };
export default function Page() { return <AdminLivePostsScreen />; }
