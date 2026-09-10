/**
 * One status vocabulary for the whole product.
 *
 * Every pill — across four deliverable domains, two review stages, three
 * participation machines and the payment ledger — resolves through this map.
 * A new status is a one-line addition, and nothing invents its own colours.
 *
 * Status is never colour alone (WCAG 1.4.1): every tone carries an icon.
 */

import type {
  DeliverableStatus,
  ParticipationStatus,
  PaymentStatus,
  ScanStatus,
} from "@/lib/types";

export type Tone = "neutral" | "info" | "warn" | "success" | "danger";

export type ToneIcon =
  | "circle"
  | "clock"
  | "eye"
  | "pencil"
  | "check"
  | "x"
  | "lock"
  | "alert"
  | "upload";

export interface StatusDescriptor {
  tone: Tone;
  icon: ToneIcon;
  label: string;
}

const DELIVERABLE: Record<DeliverableStatus, StatusDescriptor> = {
  not_started: { tone: "neutral", icon: "circle", label: "Not started" },
  blocked: { tone: "neutral", icon: "lock", label: "Locked" },
  in_production: { tone: "info", icon: "pencil", label: "In production" },
  submitted: { tone: "info", icon: "upload", label: "Submitted" },
  under_review: { tone: "info", icon: "eye", label: "Under review" },
  changes_requested: { tone: "warn", icon: "pencil", label: "Changes requested" },
  approved: { tone: "success", icon: "check", label: "Approved" },
  rejected: { tone: "danger", icon: "x", label: "Rejected" },
  live_link_submitted: { tone: "info", icon: "upload", label: "Link submitted" },
  link_verified: { tone: "success", icon: "check", label: "Link verified" },
};

const PARTICIPATION: Record<ParticipationStatus, StatusDescriptor> = {
  invited: { tone: "warn", icon: "clock", label: "Invited" },
  expired: { tone: "neutral", icon: "clock", label: "Expired" },
  applied: { tone: "info", icon: "clock", label: "Applied" },
  shortlisted: { tone: "info", icon: "eye", label: "Shortlisted" },
  selected: { tone: "warn", icon: "clock", label: "Selected" },
  not_selected: { tone: "neutral", icon: "x", label: "Not selected" },
  assigned: { tone: "warn", icon: "clock", label: "Assigned" },
  acknowledged: { tone: "info", icon: "check", label: "Acknowledged" },
  accepted: { tone: "success", icon: "check", label: "Accepted" },
  declined: { tone: "neutral", icon: "x", label: "Declined" },
  active: { tone: "info", icon: "pencil", label: "In progress" },
  withdrawn: { tone: "neutral", icon: "x", label: "Withdrawn" },
  removed: { tone: "danger", icon: "x", label: "Removed" },
  completed: { tone: "success", icon: "check", label: "Completed" },
};

/** Phase 1 is display only — no money moves through these states. */
const PAYMENT: Record<PaymentStatus, StatusDescriptor> = {
  not_eligible: { tone: "neutral", icon: "circle", label: "Not eligible yet" },
  payment_pending: { tone: "warn", icon: "clock", label: "Pending Payment" },
  approved_for_payment: { tone: "info", icon: "check", label: "Approved for payment" },
  paid: { tone: "success", icon: "check", label: "Paid" },
};

const SCAN: Record<ScanStatus, StatusDescriptor> = {
  pending: { tone: "info", icon: "clock", label: "Checking file" },
  clean: { tone: "success", icon: "check", label: "File checked" },
  infected: { tone: "danger", icon: "alert", label: "File rejected" },
  skipped: { tone: "neutral", icon: "circle", label: "Not scanned" },
};

export function deliverableStatus(s: DeliverableStatus): StatusDescriptor {
  return DELIVERABLE[s];
}

export function participationStatus(s: ParticipationStatus): StatusDescriptor {
  return PARTICIPATION[s];
}

export function paymentStatus(s: PaymentStatus): StatusDescriptor {
  return PAYMENT[s];
}

export function scanStatus(s: ScanStatus): StatusDescriptor {
  return SCAN[s];
}

/** Tailwind classes per tone. Semantic tokens only — never raw hex. */
export const TONE_CLASS: Record<Tone, string> = {
  neutral:
    "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
  info: "bg-status-info-bg text-status-info-fg border-status-info-border",
  warn: "bg-status-warn-bg text-status-warn-fg border-status-warn-border",
  success:
    "bg-status-success-bg text-status-success-fg border-status-success-border",
  danger: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
};
