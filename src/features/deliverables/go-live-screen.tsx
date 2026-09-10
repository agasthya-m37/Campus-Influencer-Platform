"use client";

import { ArrowLeft, Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/patterns/section";
import { CardSkeleton, ErrorState } from "@/components/patterns/states";
import { StatusPill } from "@/components/patterns/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation, useQuery } from "@/lib/api/hooks";
import { deliverableStatus } from "@/lib/domain/status";
import { formatDateTime } from "@/lib/format/datetime";

/**
 * J7. Approval releases the go-live instructions; the creator publishes on
 * their own channel and comes back with the link.
 *
 * Per the product decision, URL and publish time are required and the proof
 * screenshot is optional — a student on a phone should not be blocked by a
 * screenshot they can take later.
 */
export function GoLiveScreen({ deliverableId }: { deliverableId: string }) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.deliverables.get(deliverableId, { signal }),
    [deliverableId],
  );

  const [url, setUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  const submit = useMutation(
    (input: { url: string; publishedAt: string }, key: string) =>
      api.deliverables.submitLivePost(deliverableId, input, { idempotencyKey: key }),
    {
      onSuccess: () => {
        toast.success("Link added. Puzzle Media will verify it.");
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

  const { deliverable, campaign, brief, livePost } = data;
  const caption = [
    brief.content.summary.split(".")[0] + ".",
    "",
    [...brief.content.mentions, ...brief.content.hashtags].join(" "),
  ].join("\n");

  const alreadySubmitted = livePost !== null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/deliverables/${deliverableId}`}>
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
      </Button>

      <header>
        <p className="text-sm text-muted-foreground">{campaign.name}</p>
        <h1 className="mt-1 font-display text-h1">Publish your post</h1>
        <div className="mt-3">
          <StatusPill status={deliverableStatus(deliverable.status)} />
        </div>
      </header>

      <section className="space-y-3">
        <SectionHeader
          title="Before you post"
          description="Copy these into your caption."
        />
        <CopyBlock label="Caption and tags" value={caption} />
        {brief.content.must_include.length > 0 && (
          <ul className="space-y-1.5 rounded-lg border bg-card p-4">
            {brief.content.must_include.map((item) => (
              <li key={item} className="flex gap-2 text-sm">
                <span className="text-muted-foreground" aria-hidden>
                  •
                </span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </section>

      {alreadySubmitted ? (
        <section className="rounded-lg border border-status-success-border bg-status-success-bg/40 p-4">
          <p className="font-medium text-status-success-fg">Link received</p>
          <p className="mt-1 text-sm break-all">{livePost.url}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Published {formatDateTime(livePost.published_at)}
            {livePost.verified_at
              ? " · Verified by Puzzle Media"
              : " · Waiting for Puzzle Media to verify"}
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          <SectionHeader title="After you post" description="Add the link here." />

          <div className="space-y-2">
            <Label htmlFor="url">Link to your post</Label>
            <Input
              id="url"
              type="url"
              inputMode="url"
              placeholder="https://instagram.com/reel/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-describedby="url-help"
            />
            <p id="url-help" className="text-sm text-muted-foreground">
              Make sure the post is public so it can be checked.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="published">When did you post it?</Label>
            <Input
              id="published"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            A screenshot is optional. Puzzle Media will open the link to check it.
          </p>

          {submit.fieldErrors && (
            <div role="alert" className="rounded-lg border border-status-danger-border bg-status-danger-bg/40 p-4">
              {Object.values(submit.fieldErrors).map((message) => (
                <p key={message} className="text-sm text-status-danger-fg">
                  {message}
                </p>
              ))}
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            disabled={!url || !publishedAt || submit.isPending}
            onClick={() => submit.mutate({ url, publishedAt })}
          >
            {submit.isPending ? "Saving…" : "Add my link"}
          </Button>
        </section>
      )}
    </div>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-caption font-semibold tracking-wide uppercase text-muted-foreground">
          {label}
        </p>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2 text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}
