"use client";

import { ArrowLeft, Link2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { DraftCounter } from "@/components/domain/draft-counter";
import { GatingNotice } from "@/components/domain/gating-notice";
import { CardSkeleton, ErrorState } from "@/components/patterns/states";
import { UploadProgress } from "@/components/patterns/upload-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpload } from "@/hooks/use-upload";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation, useQuery } from "@/lib/api/hooks";
import { canSubmit, evaluateGate } from "@/lib/domain/deliverables";
import { validateExternalLink } from "@/lib/api/mock/upload";

const MIN_SCRIPT_LENGTH = 20;

export function SubmitScreen({ deliverableId }: { deliverableId: string }) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.deliverables.get(deliverableId, { signal }),
    [deliverableId],
  );

  const [script, setScript] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useUpload();

  const submit = useMutation(
    (
      input: { content?: string | null; externalLink?: string | null; fileRefs?: never },
      key: string,
    ) => api.deliverables.createSubmission(deliverableId, input, { idempotencyKey: key }),
    {
      onSuccess: (result) => {
        if (result.quarantined) {
          toast.error("That file did not pass our security check. Try exporting it again.");
          return;
        }
        toast.success("Submitted. The reviewer has it now.");
        router.push(`/deliverables/${deliverableId}`);
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
  if (isLoading || !data) return <CardSkeleton rows={3} />;

  const { deliverable, campaign, versions, blocker, budget, reviews } = data;
  const gate = evaluateGate(deliverable, blocker);
  const eligibility = canSubmit(deliverable, versions, blocker);
  const isVideo = deliverable.type === "video";

  // The most recent feedback, so the creator can revise against it without
  // navigating away.
  const lastFeedback = reviews
    .filter((r) => r.decision !== "approve")
    .sort((a, b) => b.decided_at.localeCompare(a.decided_at))[0];

  if (gate.blocked && gate.reason) {
    return (
      <div className="space-y-6">
        <BackLink deliverableId={deliverableId} />
        <GatingNotice reason={gate.reason} />
      </div>
    );
  }

  if (!eligibility.canSubmit) {
    return (
      <div className="space-y-6">
        <BackLink deliverableId={deliverableId} />
        <ErrorState
          title="You cannot submit right now"
          message={eligibility.reason ?? "This deliverable is not open for submission."}
        />
      </div>
    );
  }

  const uploadReady = upload.snapshot.status === "complete";
  const canSend = isVideo
    ? mode === "upload"
      ? uploadReady
      : externalLink.length > 0 && !linkError
    : script.trim().length >= MIN_SCRIPT_LENGTH;

  function handleSubmit() {
    if (isVideo) {
      if (mode === "link") {
        const err = validateExternalLink(externalLink);
        setLinkError(err);
        if (err) return;
        submit.mutate({ externalLink });
        return;
      }
      submit.mutate({
        fileRefs: [
          {
            id: upload.snapshot.id,
            name: upload.snapshot.fileName,
            size: upload.snapshot.totalBytes,
            mime: "video/mp4",
            url: upload.getObjectUrl() ?? "",
            scan_status: "pending",
          },
        ] as never,
      });
      return;
    }
    submit.mutate({ content: script });
  }

  return (
    <div className="space-y-6">
      <BackLink deliverableId={deliverableId} />

      <header>
        <p className="text-sm text-muted-foreground">{campaign.name}</p>
        <h1 className="mt-1 font-display text-h1">
          {isVideo ? "Upload your video" : "Write your script"}
        </h1>
        <div className="mt-3">
          <DraftCounter budget={budget} />
        </div>
      </header>

      {lastFeedback && (
        <section className="rounded-lg border border-status-warn-border bg-status-warn-bg/40 p-4">
          <h2 className="text-caption font-semibold tracking-wide uppercase text-status-warn-fg">
            What the reviewer asked for
          </h2>
          <p className="mt-1.5 text-sm">{lastFeedback.feedback}</p>
        </section>
      )}

      {isVideo ? (
        <section className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("upload")}
              className="flex-1"
            >
              <Upload className="size-4" aria-hidden />
              Upload file
            </Button>
            <Button
              variant={mode === "link" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("link")}
              className="flex-1"
            >
              <Link2 className="size-4" aria-hidden />
              Paste a link
            </Button>
          </div>

          {mode === "upload" ? (
            <div className="space-y-3">
              {!upload.hasSession ? (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-accent/40"
                >
                  <Upload className="size-6 text-muted-foreground" aria-hidden />
                  <span className="mt-3 font-medium">Choose your video</span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    Uploads continue if your connection drops.
                  </span>
                </button>
              ) : (
                <UploadProgress
                  snapshot={upload.snapshot}
                  onPause={upload.pause}
                  onResume={upload.resume}
                  onRetry={upload.retry}
                  onCancel={upload.clear}
                />
              )}
              <input
                ref={fileInput}
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const resumed = upload.begin(file);
                  if (resumed) {
                    toast.info("Picking up where your last upload stopped.");
                  }
                }}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="link">Preview link</Label>
              <Input
                id="link"
                type="url"
                inputMode="url"
                placeholder="https://drive.google.com/…"
                value={externalLink}
                onChange={(e) => {
                  setExternalLink(e.target.value);
                  setLinkError(null);
                }}
                onBlur={() =>
                  setLinkError(externalLink ? validateExternalLink(externalLink) : null)
                }
                aria-invalid={linkError ? true : undefined}
                aria-describedby={linkError ? "link-error" : "link-help"}
              />
              {linkError ? (
                <p id="link-error" role="alert" className="text-sm text-status-danger-fg">
                  {linkError}
                </p>
              ) : (
                <p id="link-help" className="text-sm text-muted-foreground">
                  Make sure the reviewer can open it without asking for access.
                </p>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-2">
          <Label htmlFor="script">Your script</Label>
          <Textarea
            id="script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={14}
            placeholder="Open on…"
            className="resize-y font-sans"
            aria-describedby="script-help"
          />
          <p id="script-help" className="flex justify-between text-sm text-muted-foreground">
            <span>Write it the way you would say it out loud.</span>
            <span className="font-mono tabular">{script.trim().length}</span>
          </p>
        </section>
      )}

      {submit.fieldErrors && (
        <div role="alert" className="rounded-lg border border-status-danger-border bg-status-danger-bg/40 p-4">
          {Object.values(submit.fieldErrors).map((message) => (
            <p key={message} className="text-sm text-status-danger-fg">
              {message}
            </p>
          ))}
        </div>
      )}

      <div className="sticky bottom-20 rounded-lg border bg-surface p-4 shadow-md md:bottom-4">
        <Button
          size="lg"
          className="w-full"
          disabled={!canSend || submit.isPending}
          onClick={handleSubmit}
        >
          {submit.isPending ? "Sending…" : `Submit draft ${budget.used + 1}`}
        </Button>
        <p className="mt-2 text-center text-caption text-muted-foreground">
          {budget.remaining === 1
            ? "This is your last draft."
            : `${budget.remaining} drafts left after this one.`}
        </p>
      </div>
    </div>
  );
}

function BackLink({ deliverableId }: { deliverableId: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href={`/deliverables/${deliverableId}`}>
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>
    </Button>
  );
}
