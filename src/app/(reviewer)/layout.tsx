import { DeskShell } from "@/features/shell/desk-shell";
import { SessionProvider } from "@/features/auth/session";

export default function ReviewerLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionProvider>
      <DeskShell portal="reviewer">{children}</DeskShell>
    </SessionProvider>
  );
}
