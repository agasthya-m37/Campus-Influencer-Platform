/**
 * Participation state machines (PRD §5.6.1a).
 *
 * Participation is not one state model. Treating it as one produces a status
 * field that means different things depending on how the campaign was
 * configured, which then leaks into dashboards, filters and reporting.
 * Three machines, one `participation_mode` discriminator.
 */

import type {
  CreatorProfile,
  EligibilityRules,
  ParticipationMode,
  ParticipationStatus,
  SocialAccount,
} from "@/lib/types";

export type Actor = "creator" | "puzzle_media" | "system";

export interface Transition {
  to: ParticipationStatus;
  actor: Actor;
  /** Whether a reason must accompany the transition. */
  requiresReason?: boolean;
  label: string;
}

/** Terminal states converge here; all three machines lead to `active`. */
const SHARED: Partial<Record<ParticipationStatus, Transition[]>> = {
  accepted: [
    { to: "active", actor: "system", label: "Start work" },
    {
      to: "withdrawn",
      actor: "creator",
      requiresReason: true,
      label: "Withdraw",
    },
    {
      to: "removed",
      actor: "puzzle_media",
      requiresReason: true,
      label: "Remove creator",
    },
  ],
  active: [
    { to: "completed", actor: "system", label: "Complete" },
    {
      to: "withdrawn",
      actor: "creator",
      requiresReason: true,
      label: "Withdraw",
    },
    {
      to: "removed",
      actor: "puzzle_media",
      requiresReason: true,
      label: "Remove creator",
    },
  ],
};

const INVITATION: Partial<Record<ParticipationStatus, Transition[]>> = {
  invited: [
    { to: "accepted", actor: "creator", label: "Accept" },
    { to: "declined", actor: "creator", label: "Decline" },
    { to: "expired", actor: "system", label: "Expire" },
  ],
  ...SHARED,
};

const OPEN_APPLICATION: Partial<Record<ParticipationStatus, Transition[]>> = {
  applied: [
    { to: "shortlisted", actor: "puzzle_media", label: "Shortlist" },
    { to: "not_selected", actor: "puzzle_media", label: "Not selected" },
  ],
  shortlisted: [
    { to: "selected", actor: "puzzle_media", label: "Select" },
    { to: "not_selected", actor: "puzzle_media", label: "Not selected" },
  ],
  selected: [
    { to: "accepted", actor: "creator", label: "Accept" },
    { to: "declined", actor: "creator", label: "Decline" },
  ],
  ...SHARED,
};

const DIRECT_ASSIGNMENT: Partial<Record<ParticipationStatus, Transition[]>> = {
  assigned: [
    { to: "acknowledged", actor: "creator", label: "Acknowledge" },
    {
      to: "declined",
      actor: "creator",
      requiresReason: true,
      label: "Decline",
    },
  ],
  acknowledged: [{ to: "active", actor: "system", label: "Start work" }],
  ...SHARED,
};

const MACHINES: Record<
  ParticipationMode,
  Partial<Record<ParticipationStatus, Transition[]>>
> = {
  invitation: INVITATION,
  open_application: OPEN_APPLICATION,
  direct_assignment: DIRECT_ASSIGNMENT,
};

export function allowedTransitions(
  mode: ParticipationMode,
  from: ParticipationStatus,
): Transition[] {
  return MACHINES[mode][from] ?? [];
}

export function canTransition(
  mode: ParticipationMode,
  from: ParticipationStatus,
  to: ParticipationStatus,
): boolean {
  return allowedTransitions(mode, from).some((t) => t.to === to);
}

/** Transitions the creator themselves may perform. */
export function creatorActions(
  mode: ParticipationMode,
  from: ParticipationStatus,
): Transition[] {
  return allowedTransitions(mode, from).filter((t) => t.actor === "creator");
}

const TERMINAL: ParticipationStatus[] = [
  "declined",
  "expired",
  "not_selected",
  "withdrawn",
  "removed",
  "completed",
];

export function isTerminal(status: ParticipationStatus): boolean {
  return TERMINAL.includes(status);
}

/** Statuses where the creator is expected to produce work. */
export function isWorking(status: ParticipationStatus): boolean {
  return status === "accepted" || status === "active";
}

/**
 * Expired is deliberately distinct from Declined. A creator who never saw an
 * invitation has not refused it. Different copy, different tone, and any
 * future reliability metric depends on the distinction holding.
 */
export const PARTICIPATION_LABEL: Record<ParticipationStatus, string> = {
  invited: "Invited",
  expired: "Invitation expired",
  applied: "Applied",
  shortlisted: "Shortlisted",
  selected: "Selected",
  not_selected: "Not selected",
  assigned: "Assigned",
  acknowledged: "Acknowledged",
  accepted: "Accepted",
  declined: "Declined",
  active: "In progress",
  withdrawn: "Withdrawn",
  removed: "Removed",
  completed: "Completed",
};

export const PARTICIPATION_HELP: Partial<Record<ParticipationStatus, string>> = {
  invited: "Review the brief and respond before the accept-by date.",
  expired:
    "This invitation expired before you responded. Puzzle Media may invite you again.",
  declined: "You declined this campaign.",
  not_selected: "Puzzle Media selected other creators this time.",
  withdrawn: "You withdrew from this campaign.",
  removed: "Puzzle Media removed you from this campaign.",
};

/**
 * Withdrawal stays available throughout, but is flagged once real work
 * exists so the creator understands it is not a free action.
 */
export function withdrawalWarning(hasSubmitted: boolean): string | null {
  return hasSubmitted
    ? "You have already submitted work on this campaign. Withdrawing now is recorded on your history and Puzzle Media will need to find a replacement."
    : null;
}

/**
 * Matches a creator against a campaign's `EligibilityRules` for the
 * discovery deck's open-application listing.
 *
 * There is no existing eligibility-matching convention elsewhere in the
 * codebase (brief eligibility rules exist on `Campaign`/`CampusEvent` but are
 * not yet evaluated against a creator anywhere), so the rule kept here is
 * deliberately simple and documented: for each dimension the rule specifies,
 * the creator must satisfy it; a dimension the rule leaves unset always
 * passes. `platforms`/`min_followers`/`max_followers` are checked against the
 * creator's best-matching connected social account.
 */
export function matchesEligibility(
  rules: EligibilityRules,
  profile: CreatorProfile,
  socialAccounts: SocialAccount[],
): boolean {
  if (rules.cities && rules.cities.length > 0) {
    if (!profile.city_id || !rules.cities.includes(profile.city_id)) return false;
  }
  if (rules.colleges && rules.colleges.length > 0) {
    if (!profile.college_id || !rules.colleges.includes(profile.college_id)) return false;
  }
  if (rules.categories && rules.categories.length > 0) {
    if (!rules.categories.some((c) => profile.categories.includes(c))) return false;
  }
  if (rules.languages && rules.languages.length > 0) {
    if (!rules.languages.some((l) => profile.languages.includes(l))) return false;
  }

  if (rules.platforms && rules.platforms.length > 0) {
    const matchingAccounts = socialAccounts.filter((s) => rules.platforms!.includes(s.platform));
    if (matchingAccounts.length === 0) return false;

    if (rules.min_followers !== undefined || rules.max_followers !== undefined) {
      const eligibleOnFollowers = matchingAccounts.some((s) => {
        if (rules.min_followers !== undefined && s.followers < rules.min_followers) return false;
        if (rules.max_followers !== undefined && s.followers > rules.max_followers) return false;
        return true;
      });
      if (!eligibleOnFollowers) return false;
    }
  } else if (rules.min_followers !== undefined || rules.max_followers !== undefined) {
    // No platform filter, so check against the creator's largest account.
    const best = Math.max(0, ...socialAccounts.map((s) => s.followers));
    if (rules.min_followers !== undefined && best < rules.min_followers) return false;
    if (rules.max_followers !== undefined && best > rules.max_followers) return false;
  }

  return true;
}
