import { redirect } from "next/navigation";

/**
 * Route groups mean there is no page at "/", so this resolves the landing
 * screen. The demo has no real session, so it lands on sign-in rather than
 * assuming a logged-in creator.
 */
export default function RootPage() {
  redirect("/login");
}
