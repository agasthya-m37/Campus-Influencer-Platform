import type { Metadata } from "next";
import { NotificationsScreen } from "@/features/notifications/notifications-screen";
export const metadata: Metadata = { title: "Updates" };
export default function Page() { return <NotificationsScreen />; }
