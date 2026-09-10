import { redirect } from "next/navigation";

/**
 * Route groups mean there is no page at "/", so this resolves the landing
 * screen. In production this reads the session; the mock seeds a creator.
 */
export default function RootPage() {
  redirect("/home");
}
