"use client";

import { ArrowRight, Check, FileText, Sparkles, Video, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { PageHeader } from "@/components/patterns/section";
import { StatusPill } from "@/components/patterns/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { api, type CampaignListItem, type DiscoverableCampaign } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation, useQuery } from "@/lib/api/hooks";
import { DELIVERABLE_TYPE_LABEL } from "@/lib/domain/deliverables";
import { PARTICIPATION_HELP } from "@/lib/domain/participation";
import { participationStatus } from "@/lib/domain/status";
import { openTasks } from "@/lib/domain/tasks";
import { formatMoney } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/datetime";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

import { DeckCard, type DeckItem, type SwipeDirection } from "@/features/dashboard/deck-card";

/**
 * F-DASH-03 (rewritten): the home screen IS the discovery deck. It shows
 * both campaigns the creator is already invited to and open-application
 * campaigns they are eligible for but have not yet applied to — Hinge/Tinder
 * style, one card at a time. Everything the previous "task inbox" version
 * showed (level/streak, action-required list, go-to tiles) now lives on its
 * own screen (Profile keeps the level/streak hero; /tasks keeps the full
 * queue); a compact banner here is the only trace of it, so nothing pending
 * gets lost, but the deck is the whole point of this screen.
 */
export function DashboardScreen() {
  const invitesQuery = useQuery((signal) => api.campaigns.list({ signal }), []);
  const openQuery = useQuery((signal) => api.campaigns.discoverable({ signal }), []);
  const tasksQuery = useQuery((signal) => api.tasks.list({ signal }), []);
  const prefersReducedMotion = usePrefersReducedMotion();

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [detailsFor, setDetailsFor] = useState<DeckItem | null>(null);
  const [declineTarget, setDeclineTarget] = useState<CampaignListItem | null>(null);
  const [reason, setReason] = useState("");

  const accept = useMutation(
    (assignmentId: string, key: string) =>
      api.assignments.accept(assignmentId, { idempotencyKey: key }),
    {
      onSuccess: () => toast.success("You are on the campaign. Your first task is ready."),
      onError: (e) => toast.error(messageFor(e)),
    },
  );

  const decline = useMutation(
    (input: { assignmentId: string; reason: string }, key: string) =>
      api.assignments.decline(input.assignmentId, input.reason, { idempotencyKey: key }),
    {
      onSuccess: () => {
        toast.success("Declined. Puzzle Media has been told.");
      },
      onError: (e) => toast.error(messageFor(e)),
    },
  );

  const apply = useMutation(
    (campaignId: string, key: string) => api.campaigns.apply(campaignId, { idempotencyKey: key }),
    {
      onSuccess: () => toast.success("Applied. Puzzle Media will let you know."),
      onError: (e) => toast.error(messageFor(e)),
    },
  );

  const deck: DeckItem[] = useMemo(() => {
    const invites: DeckItem[] = (invitesQuery.data?.items ?? [])
      .filter((row) => row.assignment.participation_status === "invited")
      .map((row) => ({ kind: "invite" as const, key: row.assignment.id, row }));

    const open: DeckItem[] = (openQuery.data?.items ?? []).map((item) => ({
      kind: "open" as const,
      key: item.campaign.id,
      item,
    }));

    // Invitations first — they carry a response deadline, so they are the
    // more time-sensitive of the two. Open-application campaigns follow.
    return [...invites, ...open].filter((d) => !dismissed.has(d.key));
  }, [invitesQuery.data, openQuery.data, dismissed]);

  const top = deck[0] ?? null;

  const isLoading = invitesQuery.isLoading || openQuery.isLoading;
  const error = invitesQuery.error ?? openQuery.error;

  const pendingCount = openTasks(tasksQuery.data ?? []).length;

  if (error) {
    return (
      <ErrorState
        message={messageFor(error)}
        isOffline={error.kind === "network"}
        onRetry={() => {
          invitesQuery.refetch();
          openQuery.refetch();
        }}
      />
    );
  }

  function dismiss(key: string) {
    setDismissed((prev) => new Set(prev).add(key));
  }

  async function handleAccept(row: CampaignListItem) {
    const result = await accept.mutate(row.assignment.id);
    if (result) dismiss(row.assignment.id);
  }

  async function handleApply(item: DiscoverableCampaign) {
    const result = await apply.mutate(item.campaign.id);
    if (result) dismiss(item.campaign.id);
  }

  function openDeclinePrompt(row: CampaignListItem) {
    setReason("");
    setDeclineTarget(row);
  }

  async function confirmDecline() {
    if (!declineTarget) return;
    const result = await decline.mutate({
      assignmentId: declineTarget.assignment.id,
      reason,
    });
    if (result) {
      dismiss(declineTarget.assignment.id);
      setDeclineTarget(null);
    }
  }

  function handleSwipe(deckItem: DeckItem, direction: SwipeDirection) {
    if (deckItem.kind === "invite") {
      if (direction === "right") {
        void handleAccept(deckItem.row);
      } else {
        openDeclinePrompt(deckItem.row);
      }
      return;
    }

    // Open-application campaigns have no existing assignment, so a left
    // swipe has nowhere sensible to record "not interested" — there is no
    // reason dialog and no mutation, just a local dismiss from the deck.
    if (direction === "right") {
      void handleApply(deckItem.item);
    } else {
      dismiss(deckItem.key);
    }
  }

  const isBusy = accept.isPending || decline.isPending || apply.isPending;

  return (
    // flex-col + min-h so the deck card can size itself to whatever room is
    // actually left on screen (flex-1 below) instead of assuming a fixed
    // 440px always fits above the bottom nav. On a short phone viewport a
    // fixed height plus the buttons/caption below it added up to more than
    // the space between the header and the (fixed, non-pushing) bottom nav,
    // so the card's bottom edge and its own action row ended up rendering
    // underneath the nav instead of stopping above it.
    //
    // 100dvh minus the sticky header (h-14 = 3.5rem) minus <main>'s own
    // pt-4 + pb-24 (1rem + 6rem, reserved there specifically to clear the
    // fixed bottom nav) — not a guess, the actual chrome around this page.
    <div className="flex min-h-[calc(100dvh-10.5rem)] flex-col gap-6 md:min-h-[calc(100dvh-7rem)]">
      <div className="space-y-6">
        <PageHeader title="Home" description="New campaigns, one at a time." />

        {/* Compact pending-tasks banner — replaces the old full "Action
            required" + "Also open" sections. Everything else that was on the
            previous home screen (level/streak hero, campaigns, earnings,
            impact, events, profile) lives on its own screen; the level/streak
            hero specifically now shows only on Profile, so it is not
            duplicated here. */}
        {pendingCount > 0 && (
          <Link
            href="/tasks"
            className="card-hard-on-light press-hard on-light-fill flex items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-[var(--pm-lime-200)] px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="min-w-0 font-display text-sm leading-tight">
              You have {pendingCount} thing{pendingCount === 1 ? "" : "s"} needing you
            </span>
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        )}
      </div>

      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : deck.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title="Nothing new right now"
          description="Puzzle Media adds campaigns here the moment one matches your profile."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/campaigns">See my campaigns</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {/* flex-1 + min-h-0: takes whatever vertical space is left after
              the header above and the fixed-height controls below, on any
              screen — never a hardcoded pixel value that may not fit. A
              min-height floor keeps it usable on very short viewports. */}
          <div className="relative mx-auto min-h-[320px] w-full max-w-sm flex-1">
            {deck
              .slice(0, 3)
              .map((deckItem, i) => (
                <DeckCard
                  key={deckItem.key}
                  item={deckItem}
                  isTop={i === 0}
                  stackIndex={i}
                  disabled={isBusy}
                  prefersReducedMotion={prefersReducedMotion}
                  onSwipe={(direction) => handleSwipe(deckItem, direction)}
                  onTap={() => setDetailsFor(deckItem)}
                />
              ))
              .reverse()}
          </div>

          {/* Fallback controls: the primary accessible path. Identical
              behavior via mouse, keyboard and screen reader; the drag
              gesture above is a bonus, not a requirement. */}
          {top && (
            <div className="mx-auto flex w-full max-w-sm shrink-0 gap-3">
              <Button
                size="lg"
                className="flex-1 bg-[var(--pm-red-700)] text-white hover:bg-[var(--pm-red-700)]/90"
                disabled={isBusy}
                onClick={() =>
                  top.kind === "invite" ? openDeclinePrompt(top.row) : dismiss(top.key)
                }
              >
                <X className="size-4" aria-hidden />
                {top.kind === "invite" ? "Decline" : "Pass"}
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-[var(--pm-lime-500)] text-[var(--pm-ink-900)] hover:bg-[var(--pm-lime-400)]"
                disabled={isBusy}
                onClick={() =>
                  top.kind === "invite" ? handleAccept(top.row) : handleApply(top.item)
                }
              >
                <Check className="size-4" aria-hidden />
                {top.kind === "invite"
                  ? accept.isPending
                    ? "Accepting…"
                    : "Accept"
                  : apply.isPending
                    ? "Applying…"
                    : "Apply"}
              </Button>
            </div>
          )}

          {/* Keyboard/screen-reader path to the same details the card's
              tap gesture opens — the card itself isn't a focusable control. */}
          {top && (
            <Button
              variant="ghost"
              size="sm"
              className="mx-auto flex shrink-0"
              onClick={() => setDetailsFor(top)}
            >
              View full details
            </Button>
          )}

          <p className="shrink-0 text-center text-caption text-muted-foreground">
            {deck.length} campaign{deck.length > 1 ? "s" : ""} waiting
          </p>
        </div>
      )}

      <DetailsSheet
        item={detailsFor}
        onOpenChange={(open) => !open && setDetailsFor(null)}
        isBusy={isBusy}
        acceptPending={accept.isPending}
        applyPending={apply.isPending}
        onAccept={(row) => {
          setDetailsFor(null);
          void handleAccept(row);
        }}
        onReject={(row) => {
          setDetailsFor(null);
          openDeclinePrompt(row);
        }}
        onApply={(item) => {
          setDetailsFor(null);
          void handleApply(item);
        }}
        onPass={(key) => {
          setDetailsFor(null);
          dismiss(key);
        }}
      />

      <DeclineDialog
        open={declineTarget !== null}
        onOpenChange={(open) => !open && setDeclineTarget(null)}
        reason={reason}
        onReasonChange={setReason}
        isPending={decline.isPending}
        onConfirm={confirmDecline}
      />
    </div>
  );
}

function DetailsSheet({
  item,
  onOpenChange,
  isBusy,
  acceptPending,
  applyPending,
  onAccept,
  onReject,
  onApply,
  onPass,
}: {
  item: DeckItem | null;
  onOpenChange: (open: boolean) => void;
  isBusy: boolean;
  acceptPending: boolean;
  applyPending: boolean;
  onAccept: (row: CampaignListItem) => void;
  onReject: (row: CampaignListItem) => void;
  onApply: (item: DiscoverableCampaign) => void;
  onPass: (key: string) => void;
}) {
  return (
    <Sheet open={item !== null} onOpenChange={onOpenChange}>
      {/* The sheet carries its own photo and its own Accept/Reject — it is
          the card's full-detail state, not a separate panel floating over
          it, so it never needs the card underneath to make sense on its
          own, and every action available on the card is available here. */}
      <SheetContent
        side="bottom"
        className="max-h-[90vh] gap-0 overflow-y-auto p-0 scrollbar-hide"
      >
        {item?.kind === "invite" && (
          <InviteDetails
            row={item.row}
            isBusy={isBusy}
            acceptPending={acceptPending}
            onAccept={() => onAccept(item.row)}
            onReject={() => onReject(item.row)}
          />
        )}
        {item?.kind === "open" && (
          <OpenDetails
            item={item.item}
            isBusy={isBusy}
            applyPending={applyPending}
            onApply={() => onApply(item.item)}
            onPass={() => onPass(item.key)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Full-width photo banner at the top of the sheet, with the title overlaid
 *  the same way the card presents it — the sheet reads as the card's
 *  expanded state, not a different piece of UI. */
function DetailsBanner({
  image,
  brandName,
  title,
  statusSlot,
}: {
  image: string | null;
  brandName: string;
  title: string;
  statusSlot: React.ReactNode;
}) {
  return (
    <div className="relative">
      <SheetHeader className="sr-only">
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>{brandName}</SheetDescription>
      </SheetHeader>

      {image ? (
        <div className="relative aspect-[4/3] w-full bg-muted">
          <Image src={image} alt="" aria-hidden fill unoptimized className="object-cover" />
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
                <p className="text-sm text-[var(--pm-paper-200)]">{brandName}</p>
                <p className="mt-0.5 font-display text-h1 leading-tight text-balance">{title}</p>
              </div>
              {statusSlot}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1 bg-[var(--pm-paper-200)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{brandName}</p>
              <p className="mt-0.5 font-display text-h1 leading-tight text-balance">{title}</p>
            </div>
            {statusSlot}
          </div>
        </div>
      )}
    </div>
  );
}

/** Pinned to the bottom of the sheet, so accepting/rejecting never requires
 *  closing the expanded view first — every action on the card is available
 *  here too. */
function DetailsActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 flex gap-3 border-t bg-card p-4">{children}</div>
  );
}

function InviteDetails({
  row,
  isBusy,
  acceptPending,
  onAccept,
  onReject,
}: {
  row: CampaignListItem;
  isBusy: boolean;
  acceptPending: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <>
      <DetailsBanner
        image={row.campaign.image}
        brandName={row.brand.name}
        title={row.campaign.name}
        statusSlot={
          <StatusPill size="sm" status={participationStatus(row.assignment.participation_status)} />
        }
      />

      <div className="space-y-5 p-5">
        {PARTICIPATION_HELP[row.assignment.participation_status] && (
          <p className="text-sm text-muted-foreground">
            {PARTICIPATION_HELP[row.assignment.participation_status]}
          </p>
        )}

        <section className="rounded-lg border bg-card p-4">
          <dl className="grid grid-cols-2 gap-4">
            {row.assignment.visible_to_creator && row.assignment.fee_amount !== null && (
              <div>
                <dt className="text-caption text-muted-foreground">You will be paid</dt>
                <dd className="mt-0.5 font-display text-h2 tabular">
                  {formatMoney(row.assignment.fee_amount)}
                </dd>
              </div>
            )}
            {row.assignment.accept_by && (
              <div>
                <dt className="text-caption text-muted-foreground">Respond by</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {formatDateTime(row.assignment.accept_by)}
                </dd>
              </div>
            )}
            {row.campaign.go_live_from && (
              <div>
                <dt className="text-caption text-muted-foreground">Go live window</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {formatDateTime(row.campaign.go_live_from)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
            About this campaign
          </h3>
          <p className="text-sm">{row.campaign.objective}</p>
          <p className="text-sm text-muted-foreground">{row.campaign.description}</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
            What you will make
          </h3>
          <ul className="space-y-2">
            {row.deliverables.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                {d.type === "video" ? (
                  <Video className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{DELIVERABLE_TYPE_LABEL[d.type]}</p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    Due {formatDateTime(d.due_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Button asChild variant="outline" className="w-full">
          <Link href={`/campaigns/${row.campaign.id}`}>Open full campaign page</Link>
        </Button>
      </div>

      <DetailsActionBar>
        <Button
          size="lg"
          className="flex-1 bg-[var(--pm-red-700)] text-white hover:bg-[var(--pm-red-700)]/90"
          disabled={isBusy}
          onClick={onReject}
        >
          <X className="size-4" aria-hidden />
          Decline
        </Button>
        <Button
          size="lg"
          className="flex-1 bg-[var(--pm-lime-500)] text-[var(--pm-ink-900)] hover:bg-[var(--pm-lime-400)]"
          disabled={isBusy}
          onClick={onAccept}
        >
          <Check className="size-4" aria-hidden />
          {acceptPending ? "Accepting…" : "Accept"}
        </Button>
      </DetailsActionBar>
    </>
  );
}

function OpenDetails({
  item,
  isBusy,
  applyPending,
  onApply,
  onPass,
}: {
  item: DiscoverableCampaign;
  isBusy: boolean;
  applyPending: boolean;
  onApply: () => void;
  onPass: () => void;
}) {
  const { campaign, brand } = item;
  return (
    <>
      <DetailsBanner
        image={campaign.image}
        brandName={brand.name}
        title={campaign.name}
        statusSlot={
          <StatusPill size="sm" status={{ tone: "info", icon: "circle", label: "Open" }} />
        }
      />

      <div className="space-y-5 p-5">
        <p className="text-sm text-muted-foreground">
          Apply to be considered. Puzzle Media reviews applications and lets you know if you are
          selected.
        </p>

        <section className="rounded-lg border bg-card p-4">
          <dl className="grid grid-cols-2 gap-4">
            {campaign.accept_by && (
              <div>
                <dt className="text-caption text-muted-foreground">Apply by</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {formatDateTime(campaign.accept_by)}
                </dd>
              </div>
            )}
            {campaign.go_live_from && (
              <div>
                <dt className="text-caption text-muted-foreground">Go live window</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {formatDateTime(campaign.go_live_from)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
            About this campaign
          </h3>
          <p className="text-sm">{campaign.objective}</p>
          <p className="text-sm text-muted-foreground">{campaign.description}</p>
        </section>
      </div>

      <DetailsActionBar>
        <Button
          size="lg"
          className="flex-1 bg-[var(--pm-red-700)] text-white hover:bg-[var(--pm-red-700)]/90"
          disabled={isBusy}
          onClick={onPass}
        >
          <X className="size-4" aria-hidden />
          Pass
        </Button>
        <Button
          size="lg"
          className="flex-1 bg-[var(--pm-lime-500)] text-[var(--pm-ink-900)] hover:bg-[var(--pm-lime-400)]"
          disabled={isBusy}
          onClick={onApply}
        >
          <Check className="size-4" aria-hidden />
          {applyPending ? "Applying…" : "Apply"}
        </Button>
      </DetailsActionBar>
    </>
  );
}

function DeclineDialog({
  open,
  onOpenChange,
  reason,
  onReasonChange,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onReasonChange("");
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline this campaign?</DialogTitle>
          <DialogDescription>
            Puzzle Media will offer it to another creator. You can tell them why, which helps
            them match you better next time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="home-decline-reason">
            Reason <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="home-decline-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="A sentence is enough."
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={onConfirm}>
            {isPending ? "Working…" : "Decline campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
