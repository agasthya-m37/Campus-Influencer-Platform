import type { Metadata } from "next";
import { LearnScreen } from "@/features/events/learn-screen";
export const metadata: Metadata = { title: "Learn" };
export default function Page() { return <LearnScreen />; }
