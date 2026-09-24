"use client";

import { Info, Trophy, Wallet } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { QuestTracker, type QuestCheckpoint } from "@/components/domain/quest-tracker";
import { PageHeader, SectionHeader } from "@/components/patterns/section";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/patterns/states";
import { StatusPill } from "@/components/patterns/status-pill";
import { api, type EarningRow } from "@/lib/api/client";
import { messageFor } from "@/lib/api/errors";
import { useQuery } from "@/lib/api/hooks";
import { paymentStatus } from "@/lib/domain/status";
import { EARNINGS, EARNINGS_DISCLAIMER } from "@/lib/format/copy";
import { formatMoney } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/datetime";
import type { EarningGate } from "@/lib/types";

const GATE_LABEL: Record<EarningGate, string> = {
  content_approved: "Content approved",
  link_verified: "Live link verified",
  metrics_submitted: "Results added",
  finance_approved: "Finance approved",
};

const ALL_GATES: EarningGate[] = [
  "content_approved",
  "link_verified",
  "metrics_submitted",
  "finance_approved",
];

/**
 * F-EARN. A report, not a transaction. The three headline strings are fixed
 * by F-DASH-04 and come from copy.ts rather than being typed here.
 */
export function EarningsScreen() {
  const { data, isLoading, error, refetch } = useQuery(
    (signal) => api.earnings.list({ signal }),
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

  const rows = data?.items ?? [];
  const totals = rows.reduce(
    (acc, row) => {
      const amount = row.earning?.amount ?? row.assignment.fee_amount ?? 0;
      acc.total += amount;
      if (row.earning?.status === "paid") acc.paid += amount;
      else if (row.earning?.status === "payment_pending") acc.pending += amount;
      return acc;
    },
    { total: 0, pending: 0, paid: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Earnings" />

      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : (
        <>
          <section className="space-y-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-caption text-muted-foreground">{EARNINGS.TOTAL}</p>
              <p className="mt-1 font-display text-display leading-none tabular">
                {formatMoney(totals.total)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-caption text-muted-foreground">{EARNINGS.PENDING}</p>
                <p className="mt-1 font-display text-h1 tabular">
                  {formatMoney(totals.pending)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-caption text-muted-foreground">{EARNINGS.PAID}</p>
                <p className="mt-1 font-display text-h1 tabular">
                  {formatMoney(totals.paid)}
                </p>
              </div>
            </div>
          </section>

          {/* Stated plainly, so nobody expects the app to pay them. */}
          <div className="flex gap-3 rounded-lg border border-dashed bg-surface-sunken p-4">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">{EARNINGS_DISCLAIMER}</p>
          </div>

          <section className="space-y-3">
            <SectionHeader title="Campaign by campaign" />
            {rows.length === 0 ? (
              <EmptyState
                icon={<Wallet className="size-6" />}
                title="Nothing yet"
                description="Fees appear here once you are on a campaign."
              />
            ) : (
              <ul className="space-y-2">
                {rows.map((row) => (
                  <li key={row.assignment.id}>
                    <EarningCard row={row} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function EarningCard({ row }: { row: EarningRow }) {
  const { assignment, earning, campaign, brand } = row;
  const amount = earning?.amount ?? assignment.fee_amount ?? 0;
  const status = earning?.status ?? assignment.payment_status;
  const gates = earning?.gates_met ?? [];
  const allCleared = ALL_GATES.every((g) => gates.includes(g));

  // Celebrate the moment the last gate clears, once per assignment per tab
  // session — not on every render, and not for rows that were already fully
  // gated the first time this screen was seen.
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (!allCleared || celebratedRef.current) return;
    celebratedRef.current = true;
    const key = `pm.earnings-gate.celebrated.${assignment.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    toast.success("All gates cleared", {
      description: `${campaign.name} has cleared every earning checkpoint.`,
      icon: <Trophy className="size-4" aria-hidden />,
    });
  }, [allCleared, assignment.id, campaign.name]);

  const checkpoints: QuestCheckpoint[] = ALL_GATES.map((gate) => ({
    id: gate,
    label: GATE_LABEL[gate],
    state: gates.includes(gate) ? "done" : "locked",
  }));
  // The first not-yet-met gate reads as "current" rather than flatly locked.
  const firstOpenIndex = checkpoints.findIndex((c) => c.state === "locked");
  if (firstOpenIndex !== -1) checkpoints[firstOpenIndex].state = "current";

  return (
    <article
      className={
        allCleared
          ? "card-hard-on-light on-light-fill rounded-[var(--radius-lg)] bg-[var(--pm-lime-200)] p-4"
          : "rounded-lg border bg-card p-4"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{campaign.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{brand.name}</p>
        </div>
        <p className="shrink-0 font-display text-h2 tabular">{formatMoney(amount)}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill size="sm" status={paymentStatus(status)} />
        {allCleared && status !== "paid" && (
          <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-ink bg-[var(--pm-lime-500)] px-2 py-0.5 text-caption font-semibold text-ink">
            <Trophy className="size-3" aria-hidden />
            All gates cleared
          </span>
        )}
        {earning?.updated_at && (
          <span className="text-caption text-muted-foreground">
            Updated {formatDate(earning.updated_at)}
          </span>
        )}
      </div>

      {/* The gates make "why am I not paid yet" answerable without asking. */}
      {status !== "paid" && (
        <div className="mt-3 border-t pt-3">
          <QuestTracker checkpoints={checkpoints} />
        </div>
      )}

      {earning?.status_reason && (
        <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
          {earning.status_reason}
        </p>
      )}
    </article>
  );
}
