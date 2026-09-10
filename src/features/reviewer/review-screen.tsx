"use client";

import { ArrowLeft, Check, ExternalLink, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DraftCounter } from "@/components/domain/draft-counter";
import { SubmissionVersionTimeline } from "@/components/domain/version-timeline";
import { SectionHeader } from "@/components/patterns/section";
import { SlaCountdown } from "@/components/patterns/sla-countdown";
import { CardSkeleton, ErrorState } from "@/components/patterns/states";
import { StatusPill } from "@/components/patterns/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation, useQuery } from "@/lib/api/hooks";
import { DELIVERABLE_TYPE_LABEL, draftBudget } from "@/lib/domain/deliverables";
import {
  MIN_FEEDBACK_LENGTH,
  REJECT_REASON_LABEL,
  validateDecision,
} from "@/lib/domain/review";
import { slaView } from "@/lib/domain/sla";
import { deliverableStatus } from "@/lib/domain/status";
import { formatHandle, REVIEW_STAGE_HELP, REVIEW_STAGE_LABEL } from "@/lib/format/copy";
import { formatCompact } from "@/lib/format/currency";
import { formatFull } from "@/lib/format/datetime";
import { toTimelineEntries } from "@/features/deliverables/mappers";
import type { RejectReasonCode } from "@/lib/types";

type Mode = "approve" | "request_changes" | "reject" | null;

/**
 * F-REV-02. Creator context, content, versions, brief and feedback all on
 * one screen: a reviewer should never navigate to make a decision.
 */
export function ReviewScreen({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.reviewer.submission(submissionId, { signal }),
    [submissionId],
  );

  const [mode, setMode] = useState<Mode>(null);
  const [feedback, setFeedback] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [reasonCode, setReasonCode] = useState<RejectReasonCode | "">("");
  const [endsParticipation, setEndsParticipation] = useState(false);

  const decide = useMutation(
    (
      input: Parameters<typeof api.submissions.review>[1],
      key: string,
    ) => api.submissions.review(submissionId, input, { idempotencyKey: key }),
    {
      onSuccess: ({ outcome }) => {
        setMode(null);
        setFeedback("");
        setInternalNote("");
        setReasonCode("");
        setEndsParticipation(false);

        if (outcome.releasedToNextStage && outcome.nextStage) {
          toast.success(
            `Approved and released to ${REVIEW_STAGE_LABEL[outcome.nextStage].toLowerCase()}.`,
          );
        } else if (outcome.deliverableStatus === "approved") {
          toast.success("Approved. The creator can move to the next step.");
        } else if (outcome.deliverableStatus === "rejected") {
          toast.success(
            outcome.endsParticipation
              ? "Rejected, and the creator has been removed from the campaign."
              : "Rejected. The creator stays on the campaign.",
          );
        } else {
          toast.success("Changes requested. It is back with the creator.");
        }
        router.push("/reviewer/queue");
      },
      onError: (e) => toast.error(messageFor(e)),
    },
  );

  if (error) {
    return (
      <ErrorState
        title={error.kind === "not_found" ? "Not available" : undefined}
        message={
          error.kind === "not_found"
            ? "This submission is not in your queue. Puzzle Media may not have released it yet."
            : messageFor(error)
        }
        onRetry={error.kind === "not_found" ? undefined : refetch}
      />
    );
  }
  if (isLoading || !data) return <CardSkeleton rows={4} />;

  const {
    version,
    versions,
    deliverable,
    campaign,
    brand,
    creator,
    socialAccounts,
    brief,
    reviews,
    slaClocks,
    stage,
  } = data;

  const budget = draftBudget(deliverable, versions);
  const clock = slaClocks.filter((c) => c.stage === stage && !c.paused_at).at(-1) ?? null;
  const isLastDraft = budget.remaining <= 1;

  const validation =
    mode === null
      ? null
      : validateDecision({
          stage,
          decision: mode,
          feedback,
          reasonCode: reasonCode || null,
        });

  function commit() {
    if (!mode) return;
    decide.mutate({
      stage,
      decision: mode,
      feedback,
      reasonCode: reasonCode || null,
      internalNote: internalNote || null,
      endsParticipation: mode === "reject" ? endsParticipation : false,
    });
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/reviewer/queue">
          <ArrowLeft className="size-4" aria-hidden />
          Queue
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {campaign.name} · {brand.name}
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 font-display text-h1">
            {DELIVERABLE_TYPE_LABEL[deliverable.type]}
            <Badge variant="secondary" className="font-mono tabular">
              v{version.version_no}
            </Badge>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusPill size="sm" status={deliverableStatus(deliverable.status)} />
            {clock && <SlaCountdown view={slaView(clock)} />}
          </div>
        </div>
        <div className="rounded-md border border-status-info-border bg-status-info-bg/40 px-3 py-2">
          <p className="text-sm font-medium text-status-info-fg">
            {REVIEW_STAGE_LABEL[stage]}
          </p>
          <p className="mt-0.5 max-w-xs text-caption text-muted-foreground">
            {REVIEW_STAGE_HELP[stage]}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-3">
            <SectionHeader
              title="This draft"
              description={`Submitted ${formatFull(version.submitted_at)}`}
            />
            <div className="rounded-lg border bg-card p-4">
              {version.content ? (
                <p className="text-sm whitespace-pre-wrap">{version.content}</p>
              ) : version.external_link ? (
                <a
                  href={version.external_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary underline"
                >
                  Open the preview link
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : version.file_refs.length > 0 ? (
                <div className="space-y-2">
                  {version.file_refs.map((file) => (
                    <div key={file.id} className="space-y-2">
                      <p className="text-sm font-medium">{file.name}</p>
                      {file.url && (
                        <video
                          src={file.url}
                          controls
                          className="w-full rounded-md border bg-black"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No content attached.</p>
              )}
            </div>
          </section>

          {/* Decision panel. Approve needs no feedback; the other two do. */}
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <SectionHeader title="Your decision" />

            {isLastDraft && (
              <p className="rounded-md border border-status-warn-border bg-status-warn-bg/50 p-3 text-sm text-status-warn-fg">
                This is the creator&rsquo;s last draft. Requesting changes now will
                reject the deliverable unless Puzzle Media grants another round.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant={mode === "approve" ? "default" : "outline"}
                onClick={() => setMode("approve")}
              >
                <Check className="size-4" aria-hidden />
                Approve
              </Button>
              <Button
                variant={mode === "request_changes" ? "default" : "outline"}
                onClick={() => setMode("request_changes")}
              >
                <Pencil className="size-4" aria-hidden />
                Request changes
              </Button>
              <Button
                variant={mode === "reject" ? "destructive" : "outline"}
                onClick={() => setMode("reject")}
              >
                <X className="size-4" aria-hidden />
                Reject
              </Button>
            </div>

            {mode && (
              <div className="space-y-4 border-t pt-4">
                {mode !== "approve" && (
                  <div className="space-y-2">
                    <Label htmlFor="feedback">
                      Feedback for the creator
                      <span className="ml-1 text-muted-foreground">(required)</span>
                    </Label>
                    <Textarea
                      id="feedback"
                      rows={4}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Say what to change and why. Specific beats polite."
                      aria-describedby="feedback-help"
                      aria-invalid={validation?.errors.feedback ? true : undefined}
                    />
                    <p
                      id="feedback-help"
                      className={
                        validation?.errors.feedback
                          ? "text-sm text-status-danger-fg"
                          : "text-sm text-muted-foreground"
                      }
                    >
                      {validation?.errors.feedback ??
                        `At least ${MIN_FEEDBACK_LENGTH} characters. The creator sees this.`}
                    </p>
                  </div>
                )}

                {mode === "reject" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason</Label>
                      <Select
                        value={reasonCode}
                        onValueChange={(v) => setReasonCode(v as RejectReasonCode)}
                      >
                        <SelectTrigger id="reason">
                          <SelectValue placeholder="Choose a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(REJECT_REASON_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validation?.errors.reasonCode && (
                        <p className="text-sm text-status-danger-fg">
                          {validation.errors.reasonCode}
                        </p>
                      )}
                    </div>

                    {/* The reviewer decides at reject time whether this ends
                        the creator's participation on the campaign. */}
                    <div className="flex items-start gap-3 rounded-md border border-status-danger-border bg-status-danger-bg/30 p-3">
                      <Checkbox
                        id="ends"
                        checked={endsParticipation}
                        onCheckedChange={(c) => setEndsParticipation(c === true)}
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="ends" className="font-medium">
                          Also remove this creator from the campaign
                        </Label>
                        <p className="mt-0.5 text-caption text-muted-foreground">
                          Leave unchecked to reject only this deliverable. The creator
                          stays on the campaign and Puzzle Media decides what happens next.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {mode !== "approve" && (
                  <div className="space-y-2">
                    <Label htmlFor="note">
                      Internal note
                      <span className="ml-1 text-muted-foreground">
                        (never shown to the creator)
                      </span>
                    </Label>
                    <Textarea
                      id="note"
                      rows={2}
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    disabled={decide.isPending || (validation ? !validation.valid : false)}
                    variant={mode === "reject" ? "destructive" : "default"}
                    onClick={commit}
                  >
                    {decide.isPending
                      ? "Saving…"
                      : mode === "approve"
                        ? "Confirm approval"
                        : mode === "reject"
                          ? "Confirm rejection"
                          : "Send changes"}
                  </Button>
                  <Button variant="ghost" onClick={() => setMode(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <SectionHeader title="History" />
            <SubmissionVersionTimeline entries={toTimelineEntries(versions, reviews)} />
          </section>
        </div>

        {/* Creator context and brief, always visible beside the decision. */}
        <aside className="space-y-6">
          <section className="rounded-lg border bg-card p-4">
            <h2 className="font-display text-h2">{creator.display_name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {creator.course} · Year {creator.year}
            </p>
            <div className="mt-3 space-y-2">
              {socialAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-2">
                  <a
                    href={account.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm text-primary underline"
                  >
                    {formatHandle(account.handle)}
                  </a>
                  <span className="shrink-0 font-mono text-caption tabular text-muted-foreground">
                    {formatCompact(account.followers)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-3">
              <DraftCounter budget={budget} />
            </div>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="font-display text-h2">The brief</h2>
            <p className="mt-2 text-sm">{brief.content.summary}</p>
            <div className="mt-3 space-y-3">
              <BriefBlock title="Must include" items={brief.content.must_include} />
              <BriefBlock title="Must avoid" items={brief.content.must_avoid} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function BriefBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-caption font-semibold tracking-wide uppercase text-muted-foreground">
        {title}
      </h3>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-sm">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
