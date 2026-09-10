"use client";

import { CalendarDays, MapPin, Video } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/patterns/section";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, type EventRow } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation, useQuery } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/format/datetime";

export function LearnScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.events.list({ signal }),
    [],
  );

  if (error) {
    return (
      <ErrorState
        message={messageFor(error)}
        isOffline={error.kind === "network"}
        onRetry={refetch}
      />
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learn"
        description="Workshops and sessions run by Puzzle Media."
      />

      {isLoading ? (
        <CardSkeleton rows={2} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-6" />}
          title="Nothing scheduled"
          description="New sessions appear here when they are announced."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <li key={row.event.id}>
              <EventCard row={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventCard({ row }: { row: EventRow }) {
  const { event, speaker, rsvp, goingCount } = row;
  const seatsLeft = event.capacity - goingCount;

  const toggle = useMutation((id: string) => api.events.rsvp(id), {
    onSuccess: (result) => {
      toast.success(
        result.state === "going"
          ? "You are in. We will remind you."
          : result.state === "waitlisted"
            ? "Added to the waitlist. We will tell you if a seat opens."
            : "Your spot has been released.",
      );
    },
    onError: (e) => toast.error(messageFor(e)),
  });

  const isGoing = rsvp?.state === "going";
  const isWaitlisted = rsvp?.state === "waitlisted";

  return (
    <article className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium leading-snug">{event.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              {formatDateTime(event.starts_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {event.format === "online" ? (
                <Video className="size-3.5" aria-hidden />
              ) : (
                <MapPin className="size-3.5" aria-hidden />
              )}
              {event.format === "online" ? "Online" : event.venue}
            </span>
          </p>
        </div>
        {isGoing && <Badge>Going</Badge>}
        {isWaitlisted && <Badge variant="secondary">Waitlist</Badge>}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{event.description}</p>

      {speaker && (
        <div className="mt-3 rounded-md border bg-surface-sunken p-3">
          <p className="text-caption font-semibold tracking-wide uppercase text-muted-foreground">
            Know the speaker
          </p>
          <p className="mt-1.5 text-sm font-medium">{speaker.name}</p>
          <p className="text-caption text-muted-foreground">{speaker.title}</p>
          <p className="mt-1.5 text-sm">{speaker.bio}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-caption text-muted-foreground tabular">
          {seatsLeft > 0 ? `${seatsLeft} seats left` : "Full — you can join the waitlist"}
        </p>
        <Button
          variant={isGoing ? "outline" : "default"}
          size="sm"
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(event.id)}
        >
          {toggle.isPending
            ? "Saving…"
            : isGoing
              ? "Cancel my spot"
              : seatsLeft > 0
                ? "Save my spot"
                : "Join waitlist"}
        </Button>
      </div>
    </article>
  );
}
