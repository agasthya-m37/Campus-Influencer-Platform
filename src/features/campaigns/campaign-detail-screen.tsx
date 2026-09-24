"use client";

import { ArrowLeft, Ban, Check, CircleAlert, FileText, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CardSkeleton, ErrorState } from "@/components/patterns/states";
import { SectionHeader } from "@/components/patterns/section";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation, useQuery } from "@/lib/api/hooks";
import {
  creatorActions,
  PARTICIPATION_HELP,
  withdrawalWarning,
} from "@/lib/domain/participation";
import { deliverableStatus, participationStatus } from "@/lib/domain/status";
import { DELIVERABLE_TYPE_LABEL } from "@/lib/domain/deliverables";
import { formatMoney } from "@/lib/format/currency";
import { formatDateTime, formatRelativeDeadline } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";

export function CampaignDetailScreen({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.campaigns.get(campaignId, { signal }),
    [campaignId],
  );
  const [declineOpen, setDeclineOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [reason, setReason] = useState("");

  const accept = useMutation(
    (_: void, key: string) =>
      api.assignments.accept(data!.assignment!.id, { idempotencyKey: key }),
    {
      onSuccess: () => toast.success("You are on the campaign. Your first task is ready."),
      onError: (e) => toast.error(messageFor(e)),
    },
  );

  const decline = useMutation(
    (input: string, key: string) =>
      api.assignments.decline(data!.assignment!.id, input, { idempotencyKey: key }),
    {
      onSuccess: () => {
        setDeclineOpen(false);
        toast.success("Declined. Puzzle Media has been told.");
      },
      onError: (e) => toast.error(messageFor(e)),
    },
  );

  const withdraw = useMutation(
    (input: string, key: string) =>
      api.assignments.withdraw(data!.assignment!.id, input, { idempotencyKey: key }),
    {
      onSuccess: () => {
        setWithdrawOpen(false);
        toast.success("You have withdrawn from this campaign.");
      },
      onError: (e) => toast.error(messageFor(e)),
    },
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
  if (isLoading || !data) return <CardSkeleton rows={4} />;

  const { campaign, brand, assignment, deliverables, brief } = data;
  const status = assignment?.participation_status;
  const actions = assignment
    ? creatorActions(campaign.participation_mode, assignment.participation_status)
    : [];
  const canAccept = actions.some((a) => a.to === "accepted");
  const canDecline = actions.some((a) => a.to === "declined");
  const canWithdraw = actions.some((a) => a.to === "withdrawn");
  const hasSubmitted = deliverables.some((d) => d.status !== "not_started" && d.status !== "blocked");
  const acceptDeadline = assignment?.accept_by
    ? formatRelativeDeadline(assignment.accept_by)
    : null;

  const hasStickyActions = canAccept || canDecline || canWithdraw;

  return (
    // Extra bottom padding when the sticky action bar is present: the shell's
    // own pb-24 only clears the fixed bottom nav, not this screen's own
    // sticky bar stacked above it, so the last section (the brief) was
    // scrolling in behind the "Withdraw"/"Accept" button instead of past it.
    <div className={cn("space-y-6", hasStickyActions && "pb-20")}>
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/campaigns">
          <ArrowLeft className="size-4" aria-hidden />
          Campaigns
        </Link>
      </Button>

      {/* Same photo the discovery deck and go-live/detail sheets use — this
          page is often reached straight from the deck, so the campaign
          should still look like the same campaign, not switch to a
          text-only treatment once you are past the swipe step. */}
      {campaign.image && (
        <div className="-mt-2 aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
          <Image
            src={campaign.image}
            alt=""
            aria-hidden
            width={800}
            height={450}
            unoptimized
            className="size-full object-cover"
          />
        </div>
      )}

      <header>
        <p className="text-sm text-muted-foreground">{brand.name}</p>
        <h1 className="mt-1 font-display text-h1 text-balance">{campaign.name}</h1>
        {status && (
          <div className="mt-3">
            <StatusPill status={participationStatus(status)} />
          </div>
        )}
        {status && PARTICIPATION_HELP[status] && (
          <p className="mt-2 text-sm text-muted-foreground">
            {PARTICIPATION_HELP[status]}
          </p>
        )}
      </header>

      {/* Everything needed to decide, before deciding: fee, deadlines,
          deliverables and the full brief are all above the accept action. */}
      {assignment && (
        <section className="rounded-lg border bg-card p-4">
          <dl className="grid grid-cols-2 gap-4">
            {assignment.visible_to_creator && assignment.fee_amount !== null && (
              <div>
                <dt className="text-caption text-muted-foreground">You will be paid</dt>
                <dd className="mt-0.5 font-display text-h2 tabular">
                  {formatMoney(assignment.fee_amount)}
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
          {assignment.visible_to_creator && assignment.fee_amount !== null && (
            <p className="mt-3 border-t pt-3 text-caption text-muted-foreground">
              Puzzle Media settles payments outside this app once your work is approved
              and your link is verified.
            </p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader title="What you will make" />
        <ul className="space-y-2">
          {deliverables.map((d) => (
            <li key={d.id}>
              {/* Tap through to the deliverable's own screen — that's where
                  the real submit/resubmit action lives (e.g. "Submit draft 2"
                  after changes are requested). This row used to be a dead
                  end: a status pill you could look at but not act on. */}
              <Link
                href={`/deliverables/${d.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
              >
                {d.type === "video" ? (
                  <Video className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{DELIVERABLE_TYPE_LABEL[d.type]}</p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    Due {formatDateTime(d.due_at)}
                  </p>
                </div>
                <StatusPill size="sm" status={deliverableStatus(d.status)} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <SectionHeader title="The brief" description={`Version ${brief.version}`} />
        <div className="space-y-5 rounded-lg border bg-card p-4">
          <p className="text-sm">{brief.content.summary}</p>

          <BriefList title="What to make" items={brief.content.what_to_make} />
          <BriefList title="Must include" items={brief.content.must_include} />
          <BriefList title="Must avoid" items={brief.content.must_avoid} tone="danger" />

          <div>
            <h3 className="text-caption font-semibold tracking-wide uppercase text-muted-foreground">
              Tone
            </h3>
            <p className="mt-1.5 text-sm">{brief.content.tone}</p>
          </div>

          <div>
            <h3 className="text-caption font-semibold tracking-wide uppercase text-muted-foreground">
              Tags to use
            </h3>
            <p className="mt-1.5 font-mono text-sm">
              {[...brief.content.hashtags, ...brief.content.mentions].join("  ")}
            </p>
          </div>
        </div>
      </section>

      {/* Actions come last: the creator has read everything by this point.
          No border/shadow of its own — the buttons already carry the app's
          pill-with-hard-shadow styling, and framing them in a second bordered
          box double-drew the same rectangle around a single button. */}
      {(canAccept || canDecline || canWithdraw) && (
        <section className="sticky bottom-20 space-y-3 bg-surface p-4 md:bottom-4">
          {canAccept && acceptDeadline && (
            <p className="text-sm text-muted-foreground">
              Respond by {formatDateTime(assignment!.accept_by!)} ·{" "}
              <span className="font-mono tabular">{acceptDeadline.text}</span>
            </p>
          )}
          <div className="flex gap-2">
            {canAccept && (
              <Button
                className="flex-1"
                size="lg"
                disabled={accept.isPending}
                onClick={() => accept.mutate()}
              >
                <Check className="size-4" aria-hidden />
                {accept.isPending ? "Accepting…" : "Accept campaign"}
              </Button>
            )}
            {canDecline && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setDeclineOpen(true)}
                className={canAccept ? "" : "flex-1"}
              >
                Decline
              </Button>
            )}
            {canWithdraw && !canAccept && (
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setWithdrawOpen(true)}
              >
                <Ban className="size-4" aria-hidden />
                Withdraw
              </Button>
            )}
          </div>
        </section>
      )}

      <ReasonDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        title="Decline this campaign?"
        description="Puzzle Media will offer it to another creator. You can tell them why, which helps them match you better next time."
        confirmLabel="Decline campaign"
        value={reason}
        onChange={setReason}
        isPending={decline.isPending}
        onConfirm={() => decline.mutate(reason)}
        optional
      />

      <ReasonDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        title="Withdraw from this campaign?"
        description="Puzzle Media will need to find a replacement."
        warning={withdrawalWarning(hasSubmitted)}
        confirmLabel="Withdraw"
        value={reason}
        onChange={setReason}
        isPending={withdraw.isPending}
        onConfirm={async () => {
          const result = await withdraw.mutate(reason);
          if (result) router.push("/campaigns");
        }}
      />
    </div>
  );
}

function BriefList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: "danger";
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-caption font-semibold tracking-wide uppercase text-muted-foreground">
        {title}
      </h3>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm">
            <span
              className={
                tone === "danger" ? "text-status-danger-fg" : "text-muted-foreground"
              }
              aria-hidden
            >
              {tone === "danger" ? "✕" : "•"}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  warning,
  confirmLabel,
  value,
  onChange,
  isPending,
  onConfirm,
  optional = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  warning?: string | null;
  confirmLabel: string;
  value: string;
  onChange: (value: string) => void;
  isPending: boolean;
  onConfirm: () => void;
  optional?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {warning && (
          <div className="flex gap-2 rounded-md border border-status-warn-border bg-status-warn-bg p-3">
            <CircleAlert
              className="mt-0.5 size-4 shrink-0 text-status-warn-fg"
              aria-hidden
            />
            <p className="text-sm text-status-warn-fg">{warning}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reason">
            Reason {optional && <span className="text-muted-foreground">(optional)</span>}
          </Label>
          <Textarea
            id="reason"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="A sentence is enough."
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending || (!optional && value.trim().length < 5)}
            onClick={onConfirm}
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
