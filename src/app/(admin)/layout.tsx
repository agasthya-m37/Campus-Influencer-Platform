import { DeskShell } from "@/components/chrome/desk-shell";
import { SessionProvider } from "@/features/auth/session";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionProvider>
      <DeskShell portal="admin">{children}</DeskShell>
    </SessionProvider>
  );
}
