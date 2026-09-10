import { describe, expect, it } from "vitest";

import {
  allowedTransitions,
  canTransition,
  creatorActions,
  isTerminal,
  PARTICIPATION_LABEL,
} from "./participation";
import {
  canSubmit,
  draftBudget,
  evaluateGate,
  ownerForStatus,
  statusAfterChangesRequested,
} from "./deliverables";
import {
  applyDecision,
  currentStage,
  isFullyApproved,
  isVisibleToStage,
  reviewChain,
  validateDecision,
} from "./review";
import { sortByUrgency, topActionRequired, urgencyOf, countOverdue } from "./tasks";
import { slaView, startsClock } from "./sla";
import type {
  Campaign,
  Deliverable,
  Review,
  SlaClock,
  SubmissionVersion,
  Task,
} from "@/lib/types";

/* ── fixtures ────────────────────────────────────────────────────────── */

const NOW = new Date("2026-03-10T12:00:00.000Z");

function campaign(over: Partial<Campaign> = {}): Campaign {
  return {
    id: "cmp_1",
    brand_id: "brd_1",
    name: "Test",
    objective: "",
    description: "",
    image: null,
    participation_mode: "invitation",
    status: "active",
    eligibility_rules: {},
    reveal_commercials_to_reviewer: false,
    revision_limit: 3,
    review_order: "puzzle_then_brand",
    brand_visible_from: null,
    sla_profile_id: "sla_1",
    timezone: "Asia/Kolkata",
    brief_version: 1,
    accept_by: null,
    go_live_from: null,
    go_live_to: null,
    created_at: NOW.toISOString(),
    ...over,
  };
}

function deliverable(over: Partial<Deliverable> = {}): Deliverable {
  return {
    id: "dlv_1",
    assignment_id: "asg_1",
    type: "script",
    quantity: 1,
    requirements: "",
    due_at: "2026-03-12T12:00:00.000Z",
    status: "not_started",
    current_owner_kind: "creator",
    current_owner_id: "usr_1",
    owner_since: NOW.toISOString(),
    blocked_by_deliverable_id: null,
    revision_limit: 3,
    extra_rounds_granted: 0,
    ...over,
  };
}

function version(no: number, deliverableId = "dlv_1"): SubmissionVersion {
  return {
    id: `sub_${deliverableId}_${no}`,
    deliverable_id: deliverableId,
    version_no: no,
    content: "draft",
    file_refs: [],
    external_link: null,
    submitted_by: "usr_1",
    submitted_at: NOW.toISOString(),
    scan_status: "clean",
    is_locked: false,
  };
}

function review(stage: Review["stage"], decision: Review["decision"]): Review {
  return {
    id: `rev_${stage}_${decision}`,
    submission_version_id: "sub_1",
    reviewer_id: "usr_2",
    stage,
    decision,
    feedback: "Looks good enough to pass review.",
    reason_code: null,
    internal_note: null,
    ends_participation: false,
    decided_at: NOW.toISOString(),
  };
}

function task(over: Partial<Task> = {}): Task {
  return {
    id: "tsk_1",
    user_id: "usr_1",
    type: "submit_script",
    campaign_id: "cmp_1",
    deliverable_id: "dlv_1",
    status: "open",
    due_at: "2026-03-12T12:00:00.000Z",
    action_required: "Submit your script",
    deep_link: "/deliverables/dlv_1",
    created_at: "2026-03-01T00:00:00.000Z",
    closed_at: null,
    closed_reason: null,
    ...over,
  };
}

/* ── participation ───────────────────────────────────────────────────── */

describe("participation state machines", () => {
  it("invitation accepts, declines or expires", () => {
    expect(canTransition("invitation", "invited", "accepted")).toBe(true);
    expect(canTransition("invitation", "invited", "declined")).toBe(true);
    expect(canTransition("invitation", "invited", "expired")).toBe(true);
  });

  it("keeps expired distinct from declined", () => {
    // Both are terminal, but they are different states with different copy.
    expect(isTerminal("expired")).toBe(true);
    expect(isTerminal("declined")).toBe(true);
    expect(PARTICIPATION_LABEL.expired).not.toBe(PARTICIPATION_LABEL.declined);

    // Only the creator can decline; expiry is the system's doing.
    const fromInvited = allowedTransitions("invitation", "invited");
    expect(fromInvited.find((t) => t.to === "declined")?.actor).toBe("creator");
    expect(fromInvited.find((t) => t.to === "expired")?.actor).toBe("system");
  });

  it("does not let an invitation skip straight to applied", () => {
    expect(canTransition("invitation", "invited", "applied")).toBe(false);
  });

  it("walks the open application chain in order", () => {
    expect(canTransition("open_application", "applied", "shortlisted")).toBe(true);
    expect(canTransition("open_application", "shortlisted", "selected")).toBe(true);
    expect(canTransition("open_application", "selected", "accepted")).toBe(true);
    // Cannot leap the queue.
    expect(canTransition("open_application", "applied", "accepted")).toBe(false);
  });

  it("requires acknowledgement on direct assignment", () => {
    expect(canTransition("direct_assignment", "assigned", "acknowledged")).toBe(true);
    expect(canTransition("direct_assignment", "acknowledged", "active")).toBe(true);
    expect(canTransition("direct_assignment", "assigned", "active")).toBe(false);
  });

  it("allows withdrawal from accepted and active in every mode", () => {
    for (const mode of ["invitation", "open_application", "direct_assignment"] as const) {
      expect(canTransition(mode, "accepted", "withdrawn")).toBe(true);
      expect(canTransition(mode, "active", "withdrawn")).toBe(true);
    }
  });

  it("requires a reason to withdraw", () => {
    const withdraw = creatorActions("invitation", "active").find(
      (t) => t.to === "withdrawn",
    );
    expect(withdraw?.requiresReason).toBe(true);
  });

  it("offers nothing from a terminal state", () => {
    expect(allowedTransitions("invitation", "expired")).toEqual([]);
    expect(allowedTransitions("invitation", "declined")).toEqual([]);
  });
});

/* ── video gating ────────────────────────────────────────────────────── */

describe("video gating (F-SUB-07)", () => {
  const video = deliverable({
    id: "dlv_2",
    type: "video",
    status: "blocked",
    blocked_by_deliverable_id: "dlv_1",
  });

  it("blocks video while the script is under review", () => {
    const gate = evaluateGate(video, deliverable({ status: "under_review" }));
    expect(gate.blocked).toBe(true);
    expect(gate.reason).toMatch(/script is approved/i);
  });

  it("blocks video when changes were requested on the script", () => {
    expect(evaluateGate(video, deliverable({ status: "changes_requested" })).blocked).toBe(
      true,
    );
  });

  it("unblocks video only once the script is approved", () => {
    expect(evaluateGate(video, deliverable({ status: "approved" })).blocked).toBe(false);
  });

  it("never blocks a deliverable with no gate", () => {
    expect(evaluateGate(deliverable(), null).blocked).toBe(false);
  });

  it("blocks when the blocking deliverable is missing entirely", () => {
    expect(evaluateGate(video, null).blocked).toBe(true);
  });
});

/* ── draft cap ───────────────────────────────────────────────────────── */

describe("draft cap (F-SUB-12 / D5)", () => {
  it("counts the first submission against the limit of three", () => {
    const budget = draftBudget(deliverable(), [version(1)]);
    expect(budget.used).toBe(1);
    expect(budget.remaining).toBe(2);
    expect(budget.exhausted).toBe(false);
  });

  it("is exhausted at three drafts", () => {
    const budget = draftBudget(deliverable(), [version(1), version(2), version(3)]);
    expect(budget.exhausted).toBe(true);
    expect(budget.remaining).toBe(0);
  });

  it("counts script and video separately", () => {
    const all = [version(1, "dlv_1"), version(2, "dlv_1"), version(1, "dlv_2")];
    expect(draftBudget(deliverable({ id: "dlv_1" }), all).used).toBe(2);
    expect(draftBudget(deliverable({ id: "dlv_2" }), all).used).toBe(1);
  });

  it("reopens the budget when an admin grants another round", () => {
    const extended = deliverable({ extra_rounds_granted: 1 });
    const budget = draftBudget(extended, [version(1), version(2), version(3)]);
    expect(budget.exhausted).toBe(false);
    expect(budget.limit).toBe(4);
    expect(budget.extended).toBe(true);
  });

  it("rejects the deliverable when changes are requested past the cap", () => {
    const versions = [version(1), version(2), version(3)];
    expect(statusAfterChangesRequested(deliverable(), versions)).toBe("rejected");
    expect(statusAfterChangesRequested(deliverable(), [version(1)])).toBe(
      "changes_requested",
    );
  });

  it("blocks submission once the cap is spent", () => {
    const result = canSubmit(
      deliverable({ status: "changes_requested" }),
      [version(1), version(2), version(3)],
      null,
    );
    expect(result.canSubmit).toBe(false);
    expect(result.reason).toMatch(/all 3 drafts/i);
  });

  it("blocks submission while the reviewer holds it", () => {
    expect(canSubmit(deliverable({ status: "under_review" }), [version(1)], null).canSubmit).toBe(
      false,
    );
  });

  it("allows submission when a draft remains and nothing gates it", () => {
    expect(
      canSubmit(deliverable({ status: "changes_requested" }), [version(1)], null).canSubmit,
    ).toBe(true);
  });
});

/* ── ownership ───────────────────────────────────────────────────────── */

describe("ownership", () => {
  it("hands work back to the creator when changes are requested", () => {
    expect(ownerForStatus("changes_requested")).toBe("creator");
    expect(ownerForStatus("not_started")).toBe("creator");
  });

  it("gives the reviewer the ball on submission", () => {
    expect(ownerForStatus("submitted")).toBe("reviewer");
    expect(ownerForStatus("under_review")).toBe("reviewer");
  });

  it("puts link verification on Puzzle Media", () => {
    expect(ownerForStatus("live_link_submitted")).toBe("puzzle_media");
  });
});

/* ── two-stage review ────────────────────────────────────────────────── */

describe("two-stage review (D4)", () => {
  it("orders Puzzle Media before the brand", () => {
    expect(reviewChain(campaign())).toEqual(["puzzle_media", "brand"]);
  });

  it("hides the submission from the brand until Puzzle Media approves", () => {
    const c = campaign();
    expect(isVisibleToStage(c, [], "puzzle_media")).toBe(true);
    expect(isVisibleToStage(c, [], "brand")).toBe(false);

    const released = [review("puzzle_media", "approve")];
    expect(isVisibleToStage(c, released, "brand")).toBe(true);
  });

  it("does not release to the brand on a request-changes decision", () => {
    const c = campaign();
    expect(isVisibleToStage(c, [review("puzzle_media", "request_changes")], "brand")).toBe(
      false,
    );
  });

  it("tracks which stage currently owns the submission", () => {
    const c = campaign();
    expect(currentStage(c, [])).toBe("puzzle_media");
    expect(currentStage(c, [review("puzzle_media", "approve")])).toBe("brand");
    expect(
      currentStage(c, [review("puzzle_media", "approve"), review("brand", "approve")]),
    ).toBeNull();
  });

  it("marks a deliverable approved only after the whole chain approves", () => {
    const c = campaign();
    const dlv = deliverable({ status: "under_review" });

    const first = applyDecision(c, dlv, [version(1)], [], {
      stage: "puzzle_media",
      decision: "approve",
      feedback: "",
    });
    expect(first.deliverableStatus).toBe("under_review");
    expect(first.releasedToNextStage).toBe(true);
    expect(first.nextStage).toBe("brand");

    const second = applyDecision(
      c,
      dlv,
      [version(1)],
      [review("puzzle_media", "approve")],
      { stage: "brand", decision: "approve", feedback: "" },
    );
    expect(second.deliverableStatus).toBe("approved");
    expect(second.nextStage).toBeNull();
    expect(isFullyApproved(c, [review("puzzle_media", "approve"), review("brand", "approve")])).toBe(
      true,
    );
  });

  it("approves in one step when only Puzzle Media reviews", () => {
    const c = campaign({ review_order: "puzzle_only" });
    const outcome = applyDecision(c, deliverable(), [version(1)], [], {
      stage: "puzzle_media",
      decision: "approve",
      feedback: "",
    });
    expect(outcome.deliverableStatus).toBe("approved");
  });
});

describe("review decision validation (F-SUB-08)", () => {
  it("requires no feedback to approve", () => {
    expect(
      validateDecision({ stage: "puzzle_media", decision: "approve", feedback: "" }).valid,
    ).toBe(true);
  });

  it("requires at least ten characters to request changes", () => {
    const short = validateDecision({
      stage: "puzzle_media",
      decision: "request_changes",
      feedback: "too short",
    });
    expect(short.valid).toBe(false);
    expect(short.errors.feedback).toBeDefined();

    expect(
      validateDecision({
        stage: "puzzle_media",
        decision: "request_changes",
        feedback: "Please tighten the opening hook.",
      }).valid,
    ).toBe(true);
  });

  it("requires a reason code to reject", () => {
    const noReason = validateDecision({
      stage: "puzzle_media",
      decision: "reject",
      feedback: "This does not follow the brief at all.",
    });
    expect(noReason.valid).toBe(false);
    expect(noReason.errors.reasonCode).toBeDefined();

    expect(
      validateDecision({
        stage: "puzzle_media",
        decision: "reject",
        feedback: "This does not follow the brief at all.",
        reasonCode: "off_brief",
      }).valid,
    ).toBe(true);
  });

  it("carries the reviewer's end-participation choice through", () => {
    const ends = applyDecision(campaign(), deliverable(), [version(1)], [], {
      stage: "puzzle_media",
      decision: "reject",
      feedback: "Not usable, and we are ending the assignment.",
      reasonCode: "brand_safety",
      endsParticipation: true,
    });
    expect(ends.deliverableStatus).toBe("rejected");
    expect(ends.endsParticipation).toBe(true);

    const keeps = applyDecision(campaign(), deliverable(), [version(1)], [], {
      stage: "puzzle_media",
      decision: "reject",
      feedback: "Not usable, but stay on the campaign.",
      reasonCode: "quality",
      endsParticipation: false,
    });
    expect(keeps.endsParticipation).toBe(false);
  });
});

/* ── tasks ───────────────────────────────────────────────────────────── */

describe("task urgency (F-TASK-02)", () => {
  it("classifies overdue, due soon and later", () => {
    expect(urgencyOf(task({ due_at: "2026-03-09T12:00:00.000Z" }), NOW)).toBe("overdue");
    expect(urgencyOf(task({ due_at: "2026-03-10T20:00:00.000Z" }), NOW)).toBe("due_soon");
    expect(urgencyOf(task({ due_at: "2026-03-20T12:00:00.000Z" }), NOW)).toBe("later");
    expect(urgencyOf(task({ due_at: null }), NOW)).toBe("no_deadline");
  });

  it("sorts overdue first, then due soon, then later", () => {
    const sorted = sortByUrgency(
      [
        task({ id: "later", due_at: "2026-03-20T12:00:00.000Z" }),
        task({ id: "overdue", due_at: "2026-03-09T12:00:00.000Z" }),
        task({ id: "soon", due_at: "2026-03-10T18:00:00.000Z" }),
      ],
      NOW,
    );
    expect(sorted.map((t) => t.id)).toEqual(["overdue", "soon", "later"]);
  });

  it("breaks ties on the earlier deadline", () => {
    const sorted = sortByUrgency(
      [
        task({ id: "b", due_at: "2026-03-09T18:00:00.000Z" }),
        task({ id: "a", due_at: "2026-03-09T06:00:00.000Z" }),
      ],
      NOW,
    );
    expect(sorted.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("puts undated tasks last", () => {
    const sorted = sortByUrgency(
      [task({ id: "undated", due_at: null }), task({ id: "dated" })],
      NOW,
    );
    expect(sorted.map((t) => t.id)).toEqual(["dated", "undated"]);
  });

  it("gives the dashboard the same top task the queue shows", () => {
    const tasks = [
      task({ id: "later", due_at: "2026-03-20T12:00:00.000Z" }),
      task({ id: "overdue", due_at: "2026-03-09T12:00:00.000Z" }),
    ];
    // F-DASH-01 reads the top of the very queue /tasks renders.
    expect(topActionRequired(tasks, NOW)?.id).toBe(sortByUrgency(tasks, NOW)[0].id);
    expect(topActionRequired(tasks, NOW)?.id).toBe("overdue");
  });

  it("ignores closed tasks", () => {
    const tasks = [
      task({ id: "done", status: "completed", due_at: "2026-03-01T12:00:00.000Z" }),
      task({ id: "open" }),
    ];
    expect(topActionRequired(tasks, NOW)?.id).toBe("open");
    expect(countOverdue(tasks, NOW)).toBe(0);
  });

  it("returns null when nothing is open", () => {
    expect(topActionRequired([task({ status: "completed" })], NOW)).toBeNull();
  });
});

/* ── SLA ─────────────────────────────────────────────────────────────── */

describe("SLA clock", () => {
  const clock = (over: Partial<SlaClock> = {}): SlaClock => ({
    id: "sla_1",
    deliverable_id: "dlv_1",
    submission_version_id: "sub_1",
    stage: "puzzle_media",
    started_at: "2026-03-09T12:00:00.000Z",
    due_at: "2026-03-11T12:00:00.000Z",
    paused_at: null,
    elapsed_seconds: 0,
    breached_at: null,
    mode: "calendar_hours",
    ...over,
  });

  it("does not start on a quarantined file (F-SLA-02)", () => {
    expect(startsClock("pending")).toBe(false);
    expect(startsClock("infected")).toBe(false);
    expect(startsClock("clean")).toBe(true);
  });

  it("reports time remaining while running", () => {
    const view = slaView(clock(), NOW);
    expect(view.state).toBe("running");
    expect(view.isOverdue).toBe(false);
    expect(view.remainingText).toMatch(/left/);
  });

  it("reports overdue past the due time", () => {
    const view = slaView(clock({ due_at: "2026-03-10T06:00:00.000Z" }), NOW);
    expect(view.state).toBe("breached");
    expect(view.isOverdue).toBe(true);
    expect(view.remainingText).toMatch(/^Overdue by/);
  });

  it("flags approaching breach under 25% remaining (F-REV-06)", () => {
    // Window 09:00 → 13:00; at 12:00 only 25% remains.
    const view = slaView(
      clock({ started_at: "2026-03-10T09:00:00.000Z", due_at: "2026-03-10T12:30:00.000Z" }),
      NOW,
    );
    expect(view.approachingBreach).toBe(true);
    expect(view.isOverdue).toBe(false);
  });

  it("stops counting when paused (F-SLA-03)", () => {
    const view = slaView(clock({ paused_at: "2026-03-09T18:00:00.000Z" }), NOW);
    expect(view.state).toBe("paused");
    expect(view.remainingText).toBe("Paused");
  });
});
