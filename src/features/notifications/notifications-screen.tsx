"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { PageHeader } from "@/components/patterns/section";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation, useQuery } from "@/lib/api/hooks";
import { formatRelative } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";

/** F-DASH-06: every row resolves to a specific screen and record. */
export function NotificationsScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.notifications.list({ signal }),
    [],
  );

  const markRead = useMutation((id: string) => api.notifications.markRead(id));
  const markAll = useMutation(() => api.notifications.markAllRead(), {
    onSuccess: () => toast.success("All marked as read."),
  });

  if (error) {
    return (
      <ErrorState
        message={messageFor(error)}
        isOffline={error.kind === "network"}
        onRetry={refetch}
      />
    );
  }

  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Updates"
        action={
          unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => markAll.mutate(undefined as void)}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-6" />}
          title="Nothing new"
          description="Reviews, invitations and reminders land here."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((notification) => (
            <li key={notification.id}>
              <Link
                href={notification.deep_link}
                onClick={() => {
                  if (!notification.read_at) markRead.mutate(notification.id);
                }}
                className={cn(
                  "block rounded-lg border p-4 transition-colors hover:border-primary/40",
                  notification.read_at ? "bg-card" : "border-energy-border bg-energy-bg/40",
                )}
              >
                <div className="flex items-start gap-3">
                  {!notification.read_at && (
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-energy"
                      aria-label="Unread"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{notification.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {notification.body}
                    </p>
                    <p className="mt-1.5 text-caption text-muted-foreground">
                      {formatRelative(notification.delivered_at)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
