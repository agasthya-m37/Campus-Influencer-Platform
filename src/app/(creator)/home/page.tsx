import type { Metadata } from "next";

import { DashboardScreen } from "@/features/dashboard/dashboard-screen";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return <DashboardScreen />;
}
