import type { Metadata } from "next";
import { PerformanceScreen } from "@/features/performance/performance-screen";
export const metadata: Metadata = { title: "My impact" };
export default function Page() { return <PerformanceScreen />; }
