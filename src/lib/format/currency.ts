/**
 * Currency is INR throughout Phase 1.
 *
 * Amounts are stored as integer paise to avoid float drift on a ledger that
 * finance reads. Every display site pairs this with the `.tabular` utility so
 * column widths do not shift row to row.
 */

export type Paise = number;

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrWithPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "₹5,000" — the default. Whole rupees, Indian digit grouping. */
export function formatMoney(paise: Paise): string {
  return paise % 100 === 0
    ? inr.format(paise / 100)
    : inrWithPaise.format(paise / 100);
}

/** "5,000" without the symbol, for tables that carry a currency column. */
export function formatAmount(paise: Paise): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}

export function rupees(amount: number): Paise {
  return Math.round(amount * 100);
}

/** "24.5K", "1.2M" — follower counts and reach. */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

/**
 * F-REP-06 — a rate is never shown without its denominator.
 * The caller must supply what the rate is *of*; see MetricTile, where
 * `denominator` is a required prop so an unlabelled rate is a type error.
 */
export function formatRate(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}
