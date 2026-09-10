"use client";

import { Check, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { PageHeader, SectionHeader } from "@/components/patterns/section";
import { SlaCountdown } from "@/components/patterns/sla-countdown";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { StatusPill } from "@/components/patterns/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useMutation, useQuery } from "@/lib/api/hooks";
import { DELIVERABLE_TYPE_LABEL } from "@/lib/domain/deliverables";
import { slaSortKey, slaView } from "@/lib/domain/sla";
import { deliverableStatus, paymentStatus } from "@/lib/domain/status";
import { EARNINGS } from "@/lib/format/copy";
import { formatCompact, formatMoney } from "@/lib/format/currency";
import { formatDate, formatFull } from "@/lib/format/datetime";

/* ── Overview ───────────────────────────────────────────────────────── */

export function AdminOverviewScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.admin.overview({ signal }),
    [],
  );

  if (error) {
    return <ErrorState message={messageFor(error)} onRetry={refetch} />;
  }
  if (isLoading || !data) return <CardSkeleton rows={2} />;

  const needsAttention = [
    { label: "Submissions awaiting review", value: data.pendingReview, href: "/admin/review" },
    { label: "Live links to verify", value: data.unverifiedLinks, href: "/admin/live-posts" },
    { label: "SLA breaches open", value: data.openBreaches, href: "/admin/sla" },
    { label: "Profiles to review", value: data.pendingProfiles, href: "/admin/creators" },
    { label: "Results outstanding", value: data.metricsOutstanding, href: "/admin/metrics" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="What needs a person today, and what the network looks like."
      />

      <section className="space-y-3">
        <SectionHeader title="Needs attention" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {needsAttention.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <p className="font-display text-display leading-none tabular">
                {item.value}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="The network" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Creators", value: data.creators },
            { label: "Campaigns", value: data.campaigns },
            { label: "Brands", value: data.brands },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border bg-card p-4">
              <p className="font-display text-h1 tabular">{item.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Creators ───────────────────────────────────────────────────────── */

export function AdminCreatorsScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.admin.creators({ signal }),
    [],
  );

  if (error) return <ErrorState message={messageFor(error)} onRetry={refetch} />;

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Creators" description={`${items.length} on the roster`} />

      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-surface-sunken">
              <tr className="text-left">
                <Th>Creator</Th>
                <Th>College</Th>
                <Th>Followers</Th>
                <Th>Account type</Th>
                <Th>Campaigns</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((row) => {
                const primary = row.socialAccounts[0];
                return (
                  <tr key={row.profile.id}>
                    <Td>
                      <p className="font-medium">{row.profile.display_name}</p>
                      <p className="text-caption text-muted-foreground">
                        {row.user.phone}
                      </p>
                    </Td>
                    <Td className="text-muted-foreground">
                      {row.profile.course} · Year {row.profile.year}
                    </Td>
                    <Td className="tabular">
                      {primary ? formatCompact(primary.followers) : "—"}
                    </Td>
                    <Td>
                      {primary ? (
                        <Badge
                          variant={
                            primary.account_type === "personal" ? "secondary" : "default"
                          }
                          className="capitalize"
                        >
                          {primary.account_type}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="tabular">{row.assignments}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── SLA queue ──────────────────────────────────────────────────────── */

export function AdminSlaScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.admin.slaQueue({ signal }),
    [],
  );

  if (error) return <ErrorState message={messageFor(error)} onRetry={refetch} />;

  const items = [...(data?.items ?? [])].sort(
    (a, b) => slaSortKey(a.clock) - slaSortKey(b.clock),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="SLA queue"
        description="Review clocks, least time remaining first."
      />

      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState title="No clocks running" description="Nothing is with a reviewer." />
      ) : (
        <ul className="space-y-2">
          {items.map((row) => (
            <li
              key={row.clock.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {row.creator.display_name} ·{" "}
                  {DELIVERABLE_TYPE_LABEL[row.deliverable.type]}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{row.campaign.name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill size="sm" status={deliverableStatus(row.deliverable.status)} />
                <SlaCountdown view={slaView(row.clock)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Live link verification ─────────────────────────────────────────── */

export function AdminLivePostsScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.admin.livePosts({ signal }),
    [],
  );

  const verify = useMutation((id: string, key: string) => api.livePosts.verify(id, { idempotencyKey: key }), {
    onSuccess: () => toast.success("Link verified. The fee moved to Pending Payment."),
    onError: (e) => toast.error(messageFor(e)),
  });

  if (error) return <ErrorState message={messageFor(error)} onRetry={refetch} />;

  const items = data?.items ?? [];
  const pending = items.filter((i) => !i.livePost.verified_at);
  const verified = items.filter((i) => i.livePost.verified_at);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Live links"
        description="A person checks each post matches what was approved."
      />

      {isLoading ? (
        <CardSkeleton rows={2} />
      ) : (
        <>
          <section className="space-y-3">
            <SectionHeader title="Waiting to verify" />
            {pending.length === 0 ? (
              <EmptyState title="Nothing waiting" />
            ) : (
              <ul className="space-y-2">
                {pending.map((row) => (
                  <li
                    key={row.livePost.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{row.creator.display_name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {row.campaign.name} · posted {formatDate(row.livePost.published_at)}
                      </p>
                      <a
                        href={row.livePost.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm text-primary underline"
                      >
                        Open the post
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    </div>
                    <Button
                      size="sm"
                      disabled={verify.isPending}
                      onClick={() => verify.mutate(row.livePost.id)}
                    >
                      <Check className="size-4" aria-hidden />
                      Mark verified
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {verified.length > 0 && (
            <section className="space-y-3">
              <SectionHeader title="Verified" />
              <ul className="space-y-2">
                {verified.map((row) => (
                  <li key={row.livePost.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{row.creator.display_name}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {row.campaign.name}
                        </p>
                      </div>
                      <span className="text-caption text-muted-foreground">
                        Verified {formatFull(row.livePost.verified_at!)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ── Earnings and the finance export ────────────────────────────────── */

export function AdminEarningsScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.admin.earnings({ signal }),
    [],
  );

  if (error) return <ErrorState message={messageFor(error)} onRetry={refetch} />;

  const items = data?.items ?? [];
  const payable = items.filter(
    (i) => i.earning.status === "payment_pending" || i.earning.status === "approved_for_payment",
  );

  /**
   * F-EARN-05. The Phase 1 finance output is a file a human acts on — no
   * money moves in the platform, so this export *is* the deliverable.
   */
  function exportCsv() {
    const header = [
      "creator_name",
      "campaign",
      "brand",
      "amount_inr",
      "status",
      "gates_met",
      "updated_at",
    ];
    const rows = items.map((row) => [
      row.creator.display_name,
      row.campaign.name,
      row.brand.name,
      // Plain decimal, not display-formatted: finance systems parse this,
      // and Indian digit grouping would arrive as a quoted string.
      (row.earning.amount / 100).toFixed(2),
      row.earning.status,
      row.earning.gates_met.join(" "),
      row.earning.updated_at,
    ]);

    const escape = (value: string) =>
      /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    const csv = [header, ...rows].map((r) => r.map(escape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `puzzle-media-payables-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded.");
  }

  const totalPayable = payable.reduce((sum, r) => sum + r.earning.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Earnings"
        description="Puzzle Media settles these outside the platform."
        action={
          <Button onClick={exportCsv} disabled={items.length === 0}>
            <Download className="size-4" aria-hidden />
            Export for finance
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-caption text-muted-foreground">{EARNINGS.PENDING}</p>
          <p className="mt-1 font-display text-h1 tabular">{formatMoney(totalPayable)}</p>
          <p className="mt-1 text-caption text-muted-foreground">
            across {payable.length} assignment{payable.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-surface-sunken">
              <tr className="text-left">
                <Th>Creator</Th>
                <Th>Campaign</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((row) => (
                <tr key={row.earning.id}>
                  <Td className="font-medium">{row.creator.display_name}</Td>
                  <Td className="text-muted-foreground">
                    {row.campaign.name}
                    <span className="block text-caption">{row.brand.name}</span>
                  </Td>
                  <Td className="tabular">{formatMoney(row.earning.amount)}</Td>
                  <Td>
                    <StatusPill size="sm" status={paymentStatus(row.earning.status)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Audit log ──────────────────────────────────────────────────────── */

export function AdminAuditScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.admin.audit({ signal }),
    [],
  );

  if (error) return <ErrorState message={messageFor(error)} onRetry={refetch} />;

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Append-only. Every decision, with who and when."
      />

      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing recorded yet"
          description="Entries appear as people act in the platform."
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {items.map((entry) => (
            <li key={entry.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-sm">{entry.action}</p>
                <p className="text-caption text-muted-foreground">{formatFull(entry.at)}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {entry.entity_type} · {entry.entity_id}
              </p>
              {entry.reason && <p className="mt-1.5 text-sm">{entry.reason}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── shared ─────────────────────────────────────────────────────────── */

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-caption font-semibold tracking-wide uppercase text-muted-foreground">
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top ${className ?? ""}`}>{children}</td>;
}

/** Reviewer-side campaign progress (F-REV-05). */
export function ReviewerCampaignsScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.reviewer.queue({ signal }),
    [],
  );

  if (error) return <ErrorState message={messageFor(error)} onRetry={refetch} />;
  if (isLoading) return <CardSkeleton rows={2} />;

  const byCampaign = new Map<string, { name: string; brand: string; count: number }>();
  for (const item of data?.items ?? []) {
    const existing = byCampaign.get(item.campaign.id);
    byCampaign.set(item.campaign.id, {
      name: item.campaign.name,
      brand: item.brand.name,
      count: (existing?.count ?? 0) + 1,
    });
  }

  const rows = [...byCampaign.values()];

  return (
    <div className="space-y-6">
      <PageHeader title="Campaigns" description="What is with you, by campaign." />
      {rows.length === 0 ? (
        <EmptyState title="Nothing assigned" description="Campaigns appear when work reaches you." />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.name}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4"
            >
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{row.brand}</p>
              </div>
              <span className="font-mono text-sm tabular text-muted-foreground">
                {row.count} waiting
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
