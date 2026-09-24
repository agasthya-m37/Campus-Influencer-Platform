"use client";

import {
  CalendarDays,
  ExternalLink,
  FileText,
  MapPin,
  Video,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/patterns/section";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api, type EventRow } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation, useQuery } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/format/datetime";

const EVENT_TYPE_LABEL: Record<EventRow["event"]["type"], string> = {
  workshop: "Workshop",
  webinar: "Webinar",
  meetup: "Meetup",
  training: "Training",
};

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
  const [expanded, setExpanded] = useState(false);

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

  const rsvpLabel = toggle.isPending
    ? "Saving…"
    : isGoing
      ? "Cancel my spot"
      : seatsLeft > 0
        ? "Save my spot"
        : "Join waitlist";

  return (
    <article className="overflow-hidden rounded-lg border bg-card">
      {/* Everything above the RSVP row is one button into the expanded
          details sheet — same tap-to-expand pattern as the discovery deck's
          cards, so an image (here, or a fallback) is always a legible
          affordance, not a dead area. The RSVP button below is a sibling,
          not nested inside it, so it keeps working on its own (matching how
          the deck's Accept/Reject stay usable without opening the card
          first) without ending up as an invalid button-inside-a-button. */}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {event.image && (
          <div className="relative aspect-[16/9] w-full bg-muted">
            <Image src={event.image} alt="" fill unoptimized className="object-cover" />
          </div>
        )}

        <div className="p-4 pb-0">
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
            <div className="mt-3 flex gap-3 rounded-md border bg-surface-sunken p-3">
              <Avatar size="lg" className="shrink-0">
                <AvatarImage src={speaker.photo ?? undefined} alt="" />
                <AvatarFallback>{initials(speaker.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-caption font-semibold tracking-wide uppercase text-muted-foreground">
                  Know the speaker
                </p>
                <p className="mt-1.5 text-sm font-medium">{speaker.name}</p>
                <p className="text-caption text-muted-foreground">{speaker.title}</p>
                <p className="mt-1.5 text-sm">{speaker.bio}</p>
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-caption text-muted-foreground">
            Tap for full details
          </p>
        </div>
      </button>

      <div className="flex items-center justify-between gap-3 p-4">
        <p className="text-caption text-muted-foreground tabular">
          {seatsLeft > 0 ? `${seatsLeft} seats left` : "Full — you can join the waitlist"}
        </p>
        <Button
          variant={isGoing ? "outline" : "default"}
          size="sm"
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(event.id)}
        >
          {rsvpLabel}
        </Button>
      </div>

      <EventDetailsSheet
        row={row}
        open={expanded}
        onOpenChange={setExpanded}
        rsvpLabel={rsvpLabel}
        rsvpPending={toggle.isPending}
        onRsvp={() => toggle.mutate(event.id)}
      />
    </article>
  );
}

function EventDetailsSheet({
  row,
  open,
  onOpenChange,
  rsvpLabel,
  rsvpPending,
  onRsvp,
}: {
  row: EventRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rsvpLabel: string;
  rsvpPending: boolean;
  onRsvp: () => void;
}) {
  const { event, speaker, rsvp, goingCount } = row;
  const seatsLeft = event.capacity - goingCount;
  const isGoing = rsvp?.state === "going";
  const isWaitlisted = rsvp?.state === "waitlisted";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Same shape as the discovery deck's details sheet: a full-width
          photo banner carrying the title (or a plain header when there is
          no image), the rest of the detail below it, and the primary action
          pinned to the bottom so acting never requires closing the sheet
          first. */}
      <SheetContent side="bottom" className="max-h-[90vh] gap-0 overflow-y-auto p-0 scrollbar-hide">
        <div className="relative">
          <SheetHeader className="sr-only">
            <SheetTitle>{event.title}</SheetTitle>
            <SheetDescription>{EVENT_TYPE_LABEL[event.type]}</SheetDescription>
          </SheetHeader>

          {event.image ? (
            <div className="relative aspect-[4/3] w-full bg-muted">
              <Image src={event.image} alt="" aria-hidden fill unoptimized className="object-cover" />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, var(--pm-ink-900) 0%, rgba(0,0,0,0.55) 32%, rgba(0,0,0,0) 62%)",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-5 text-[var(--pm-paper-50)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--pm-paper-200)]">
                      {EVENT_TYPE_LABEL[event.type]}
                    </p>
                    <p className="mt-0.5 font-display text-h1 leading-tight text-balance">
                      {event.title}
                    </p>
                  </div>
                  {isGoing && <Badge>Going</Badge>}
                  {isWaitlisted && <Badge variant="secondary">Waitlist</Badge>}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--pm-paper-200)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {EVENT_TYPE_LABEL[event.type]}
                  </p>
                  <p className="mt-0.5 font-display text-h1 leading-tight text-balance">
                    {event.title}
                  </p>
                </div>
                {isGoing && <Badge>Going</Badge>}
                {isWaitlisted && <Badge variant="secondary">Waitlist</Badge>}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5 p-5">
          <section className="rounded-lg border bg-card p-4">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-caption text-muted-foreground">Starts</dt>
                <dd className="mt-0.5 text-sm font-medium">{formatDateTime(event.starts_at)}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Ends</dt>
                <dd className="mt-0.5 text-sm font-medium">{formatDateTime(event.ends_at)}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Where</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {event.format === "online" ? "Online" : (event.venue ?? "In person")}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">RSVP by</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {formatDateTime(event.rsvp_deadline)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-2">
            <h3 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
              About this session
            </h3>
            <p className="text-sm">{event.description}</p>
          </section>

          {speaker && (
            <section className="space-y-2">
              <h3 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
                Know the speaker
              </h3>
              <div className="flex gap-3 rounded-md border bg-surface-sunken p-3">
                <Avatar size="lg" className="shrink-0">
                  <AvatarImage src={speaker.photo ?? undefined} alt="" />
                  <AvatarFallback>{initials(speaker.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{speaker.name}</p>
                  <p className="text-caption text-muted-foreground">{speaker.title}</p>
                  <p className="mt-1.5 text-sm">{speaker.bio}</p>
                </div>
              </div>
            </section>
          )}

          {event.resources.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
                Resources
              </h3>
              <ul className="space-y-2">
                {event.resources.map((resource) => (
                  <li key={resource.url}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:border-primary/40"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{resource.label}</span>
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {isGoing && event.link && (
            <Button asChild variant="outline" className="w-full">
              <a href={event.link} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" aria-hidden />
                Join link
              </a>
            </Button>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t bg-card p-4">
          <p className="flex-1 self-center text-caption text-muted-foreground tabular">
            {seatsLeft > 0 ? `${seatsLeft} seats left` : "Full — join the waitlist"}
          </p>
          <Button
            variant={isGoing ? "outline" : "default"}
            size="lg"
            disabled={rsvpPending}
            onClick={onRsvp}
          >
            {rsvpLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
