import type { Metadata } from "next";
import { EarningsScreen } from "@/features/earnings/earnings-screen";
export const metadata: Metadata = { title: "Earnings" };
export default function Page() { return <EarningsScreen />; }
