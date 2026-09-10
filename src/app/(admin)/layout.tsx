import { DeskShell } from "@/features/shell/desk-shell";
import { SessionProvider } from "@/features/auth/session";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionProvider>
      <DeskShell portal="admin">{children}</DeskShell>
    </SessionProvider>
  );
}
