/**
 * Seed fixtures.
 *
 * One fully realized creator across every state the workflow can reach, so
 * every screen has something true to render and the whole loop is walkable
 * without clicking through setup first.
 *
 * Ids are deterministic (cmp_001, dlv_001) so deep links stay stable between
 * reloads. Dates are relative to now, so SLA countdowns are always live and
 * the overdue state is always genuinely overdue.
 */

import { addDays, addHours } from "@/lib/format/datetime";
import { rupees } from "@/lib/format/currency";
import { emptyDatabase, type Database } from "@/lib/api/mock/store";
import type {
  Campaign,
  CampaignAssignment,
  Deliverable,
  Task,
} from "@/lib/types";

const now = () => new Date().toISOString();

/* ── taxonomy ───────────────────────────────────────────────────────── */

function taxonomy(): Database["taxonomy"] {
  const mk = (
    id: string,
    kind: Database["taxonomy"][number]["kind"],
    name: string,
  ) => ({ id, kind, name, parent_id: null, deprecated: false });

  return [
    mk("city_blr", "city", "Bengaluru"),
    mk("city_del", "city", "Delhi NCR"),
    mk("city_mum", "city", "Mumbai"),
    mk("city_vlr", "city", "Vellore"),
    mk("city_pun", "city", "Pune"),
    mk("clg_vit", "college", "VIT Vellore"),
    mk("clg_srcc", "college", "SRCC, Delhi University"),
    mk("clg_manipal", "college", "Manipal Institute of Technology"),
    mk("clg_christ", "college", "Christ University"),
    mk("cat_fashion", "category", "Fashion"),
    mk("cat_tech", "category", "Tech"),
    mk("cat_food", "category", "Food"),
    mk("cat_fitness", "category", "Fitness"),
    mk("cat_finance", "category", "Personal finance"),
    mk("cat_campus", "category", "Campus life"),
    mk("lang_en", "language", "English"),
    mk("lang_hi", "language", "Hindi"),
    mk("lang_ta", "language", "Tamil"),
    mk("lang_te", "language", "Telugu"),
    mk("lang_kn", "language", "Kannada"),
  ];
}

/* ── campaign builder ───────────────────────────────────────────────── */

interface CampaignSpec {
  id: string;
  brandId: string;
  name: string;
  objective: string;
  summary: string;
  mode: Campaign["participation_mode"];
}

function campaignOf(spec: CampaignSpec, over: Partial<Campaign> = {}): Campaign {
  return {
    id: spec.id,
    brand_id: spec.brandId,
    name: spec.name,
    objective: spec.objective,
    description: spec.summary,
    image: null,
    participation_mode: spec.mode,
    status: "active",
    eligibility_rules: {},
    reveal_commercials_to_reviewer: false,
    revision_limit: 3,
    review_order: "puzzle_then_brand",
    brand_visible_from: addDays(now(), -20),
    sla_profile_id: "sla_default",
    timezone: "Asia/Kolkata",
    brief_version: 1,
    accept_by: null,
    go_live_from: null,
    go_live_to: null,
    created_at: addDays(now(), -25),
    ...over,
  };
}

function assignmentOf(
  id: string,
  campaignId: string,
  over: Partial<CampaignAssignment> = {},
): CampaignAssignment {
  return {
    id,
    campaign_id: campaignId,
    creator_id: CREATOR_ID,
    participation_status: "active",
    fee_amount: rupees(5000),
    fee_currency: "INR",
    barter_value: null,
    visible_to_creator: true,
    invited_at: addDays(now(), -14),
    accept_by: null,
    accepted_at: addDays(now(), -13),
    withdrawn_at: null,
    withdrawn_reason: null,
    payment_status: "not_eligible",
    replaces_assignment_id: null,
    ...over,
  };
}

function deliverableOf(
  id: string,
  assignmentId: string,
  type: Deliverable["type"],
  over: Partial<Deliverable> = {},
): Deliverable {
  return {
    id,
    assignment_id: assignmentId,
    type,
    quantity: 1,
    requirements: "",
    due_at: addDays(now(), 3),
    status: "not_started",
    current_owner_kind: "creator",
    current_owner_id: CREATOR_ID,
    owner_since: addDays(now(), -2),
    blocked_by_deliverable_id: null,
    revision_limit: 3,
    extra_rounds_granted: 0,
    ...over,
  };
}

const CREATOR_ID = "usr_creator";
/** Puzzle Media reviews inside the admin console; there is no separate
 *  reviewer account. The reviewer portal is brand-side only. */
const REVIEWER_PM_ID = "usr_admin";
const REVIEWER_BRAND_ID = "usr_brand";

/* ── the seed ───────────────────────────────────────────────────────── */

export function seedDatabase(): Database {
  const db = emptyDatabase();
  const t = now();

  db.taxonomy = taxonomy();

  /* Users */
  db.users = [
    {
      id: CREATOR_ID,
      role: "creator",
      status: "active",
      phone: "+919876543210",
      email: "ananya.rao@example.in",
      phone_verified_at: addDays(t, -40),
      email_verified_at: addDays(t, -40),
      timezone: "Asia/Kolkata",
      last_active_at: t,
      brand_id: null,
    },
    {
      id: REVIEWER_BRAND_ID,
      role: "brand_reviewer",
      status: "active",
      phone: "+919000000002",
      email: "marketing@zenfit.in",
      phone_verified_at: addDays(t, -60),
      email_verified_at: addDays(t, -60),
      timezone: "Asia/Kolkata",
      last_active_at: t,
      brand_id: "brd_zenfit",
    },
    {
      id: "usr_admin",
      role: "super_admin",
      status: "active",
      phone: "+919000000003",
      email: "admin@puzzlemedia.in",
      phone_verified_at: addDays(t, -120),
      email_verified_at: addDays(t, -120),
      timezone: "Asia/Kolkata",
      last_active_at: t,
      brand_id: null,
    },
  ];

  db.session = { userId: CREATOR_ID };

  /* Creator profile */
  db.creatorProfiles = [
    {
      id: "crp_001",
      user_id: CREATOR_ID,
      display_name: "Ananya Rao",
      photo: null,
      dob: "2005-06-14",
      college_id: "clg_vit",
      city_id: "city_vlr",
      course: "B.Tech Computer Science",
      year: 3,
      grad_year: 2027,
      bio: "Campus life, study routines and the occasional hostel food review.",
      languages: ["lang_en", "lang_ta", "lang_hi"],
      categories: ["cat_campus", "cat_tech"],
      formats: ["reel", "story", "carousel"],
      availability: "Weekends and weekday evenings",
      brand_preferences: ["cat_tech", "cat_fitness"],
      completeness_score: 85,
      verification_status: "active",
      submitted_at: addDays(t, -39),
      reviewed_at: addDays(t, -38),
      review_note: null,
    },
  ];

  db.socialAccounts = [
    {
      id: "soc_001",
      creator_id: "crp_001",
      platform: "instagram",
      handle: "ananya.builds",
      url: "https://instagram.com/ananya.builds",
      followers: 24300,
      typical_views: 18500,
      engagement_rate: 4.8,
      // Creator account: automated refresh is possible for this one.
      account_type: "creator",
      auth_state: "connected",
      token_ref: "tok_mock_001",
      last_refreshed_at: addHours(t, -6),
      refresh_error: null,
    },
    {
      id: "soc_002",
      creator_id: "crp_001",
      platform: "youtube",
      handle: "@ananyabuilds",
      url: "https://youtube.com/@ananyabuilds",
      followers: 3100,
      typical_views: 1200,
      engagement_rate: 3.1,
      // Personal: the API returns nothing, so manual entry is the only path.
      account_type: "personal",
      auth_state: "not_connected",
      token_ref: null,
      last_refreshed_at: null,
      refresh_error: null,
    },
  ];

  db.consents = (
    ["terms", "privacy", "content_usage", "age_eligibility"] as const
  ).map((type, i) => ({
    id: `con_00${i + 1}`,
    user_id: CREATOR_ID,
    type,
    document_version: "v1.0",
    accepted_at: addDays(t, -39),
    ip: "203.0.113.42",
    user_agent: "Mozilla/5.0 (Linux; Android 13)",
  }));

  /* Brands */
  db.brands = [
    { id: "brd_zenfit", name: "ZenFit", logo: null, guidelines_ref: null, status: "active" },
    { id: "brd_paytm", name: "Nova Pay", logo: null, guidelines_ref: null, status: "active" },
    { id: "brd_chai", name: "Chai Point", logo: null, guidelines_ref: null, status: "active" },
    { id: "brd_noise", name: "Noise Audio", logo: null, guidelines_ref: null, status: "active" },
  ];

  db.campaignReviewers = [
    { campaign_id: "cmp_001", user_id: REVIEWER_PM_ID, sequence: 1, can_reassign: true },
    { campaign_id: "cmp_001", user_id: REVIEWER_BRAND_ID, sequence: 2, can_reassign: false },
    { campaign_id: "cmp_002", user_id: REVIEWER_PM_ID, sequence: 1, can_reassign: true },
    { campaign_id: "cmp_002", user_id: REVIEWER_BRAND_ID, sequence: 2, can_reassign: false },
    { campaign_id: "cmp_003", user_id: REVIEWER_PM_ID, sequence: 1, can_reassign: true },
    { campaign_id: "cmp_004", user_id: REVIEWER_PM_ID, sequence: 1, can_reassign: true },
    { campaign_id: "cmp_005", user_id: REVIEWER_PM_ID, sequence: 1, can_reassign: true },
  ];

  /* ── Campaign 1: script needs revision (round 2 of 3) ─────────────── */
  db.campaigns.push(
    campaignOf({
      id: "cmp_001",
      brandId: "brd_zenfit",
      name: "ZenFit Campus Fitness Challenge",
      objective: "Drive app installs among first-year students",
      summary:
        "A 30-second reel showing how you fit a workout into a packed campus day.",
      mode: "invitation",
    }),
  );
  db.assignments.push(
    assignmentOf("asg_001", "cmp_001", { fee_amount: rupees(6000) }),
  );
  db.deliverables.push(
    deliverableOf("dlv_001", "asg_001", "script", {
      status: "changes_requested",
      requirements: "Hook in the first 3 seconds. Mention the 7-day free trial once.",
      due_at: addHours(t, 20),
      owner_since: addHours(t, -4),
      current_owner_kind: "creator",
    }),
    deliverableOf("dlv_002", "asg_001", "video", {
      status: "blocked",
      blocked_by_deliverable_id: "dlv_001",
      requirements: "Vertical 9:16, under 45 seconds, natural light.",
      due_at: addDays(t, 5),
      current_owner_kind: "system",
      current_owner_id: null,
    }),
  );
  db.submissionVersions.push({
    id: "sub_001",
    deliverable_id: "dlv_001",
    version_no: 1,
    content:
      "Open on my alarm at 6am. Voiceover: 'Everyone says there's no time to train during placement season.' Cut to me doing a 15-minute ZenFit session between lectures...",
    file_refs: [],
    external_link: null,
    submitted_by: CREATOR_ID,
    submitted_at: addHours(t, -28),
    scan_status: "clean",
    is_locked: false,
  });
  db.reviews.push({
    id: "rev_001",
    submission_version_id: "sub_001",
    reviewer_id: REVIEWER_PM_ID,
    stage: "puzzle_media",
    decision: "request_changes",
    feedback:
      "Strong opening. Two things: the trial mention lands too late, move it before the 20-second mark, and please drop the line comparing ZenFit to other apps by name.",
    reason_code: null,
    internal_note: "Brand is sensitive about competitor mentions.",
    ends_participation: false,
    decided_at: addHours(t, -4),
  });

  /* ── Campaign 2: script approved, video in production ─────────────── */
  db.campaigns.push(
    campaignOf({
      id: "cmp_002",
      brandId: "brd_noise",
      name: "Noise Buds Study Session",
      objective: "Position Noise Buds as the study companion for exam season",
      summary: "A study-with-me reel featuring Noise Buds during a late-night session.",
      mode: "invitation",
    }),
  );
  db.assignments.push(
    assignmentOf("asg_002", "cmp_002", { fee_amount: rupees(4500) }),
  );
  db.deliverables.push(
    deliverableOf("dlv_003", "asg_002", "script", {
      status: "approved",
      requirements: "Show the noise cancellation moment clearly.",
      due_at: addDays(t, -3),
      current_owner_kind: "system",
      current_owner_id: null,
      owner_since: addDays(t, -3),
    }),
    deliverableOf("dlv_004", "asg_002", "video", {
      status: "in_production",
      blocked_by_deliverable_id: "dlv_003",
      requirements: "Vertical 9:16, show the buds in frame within 5 seconds.",
      due_at: addHours(t, 40),
      owner_since: addDays(t, -3),
    }),
  );
  db.submissionVersions.push({
    id: "sub_002",
    deliverable_id: "dlv_003",
    version_no: 1,
    content:
      "Library, 11pm. Text on screen: 'Two chapters left.' I put in the buds, the room noise drops away, and the montage speeds up...",
    file_refs: [],
    external_link: null,
    submitted_by: CREATOR_ID,
    submitted_at: addDays(t, -5),
    scan_status: "clean",
    is_locked: true,
  });
  db.reviews.push(
    {
      id: "rev_002",
      submission_version_id: "sub_002",
      reviewer_id: REVIEWER_PM_ID,
      stage: "puzzle_media",
      decision: "approve",
      feedback: "Clean and on brief. Sending to the brand.",
      reason_code: null,
      internal_note: null,
      ends_participation: false,
      decided_at: addDays(t, -4),
    },
    {
      id: "rev_003",
      submission_version_id: "sub_002",
      reviewer_id: REVIEWER_BRAND_ID,
      stage: "brand",
      decision: "approve",
      feedback: "Approved. Please keep the product shot at least 3 seconds.",
      reason_code: null,
      internal_note: null,
      ends_participation: false,
      decided_at: addDays(t, -3),
    },
  );

  /* ── Campaign 3: new invitation, not yet answered ─────────────────── */
  db.campaigns.push(
    campaignOf(
      {
        id: "cmp_003",
        brandId: "brd_chai",
        name: "Chai Point Monsoon Menu",
        objective: "Drive footfall to campus-adjacent stores",
        summary: "A taste-test reel of three new monsoon drinks.",
        mode: "invitation",
      },
      { accept_by: addHours(t, 30), go_live_from: addDays(t, 8), go_live_to: addDays(t, 12) },
    ),
  );
  db.assignments.push(
    assignmentOf("asg_003", "cmp_003", {
      participation_status: "invited",
      fee_amount: rupees(3500),
      invited_at: addHours(t, -18),
      accept_by: addHours(t, 30),
      accepted_at: null,
    }),
  );
  db.deliverables.push(
    deliverableOf("dlv_005", "asg_003", "script", {
      status: "not_started",
      requirements: "Try all three drinks on camera. Genuine reactions only.",
      due_at: addDays(t, 4),
    }),
    deliverableOf("dlv_006", "asg_003", "video", {
      status: "blocked",
      blocked_by_deliverable_id: "dlv_005",
      requirements: "Shoot in-store if possible.",
      due_at: addDays(t, 7),
      current_owner_kind: "system",
      current_owner_id: null,
    }),
  );

  /* ── Campaign 4: published, awaiting metrics ──────────────────────── */
  db.campaigns.push(
    campaignOf(
      {
        id: "cmp_004",
        brandId: "brd_paytm",
        name: "Nova Pay Student UPI",
        objective: "Explain split payments to first-time users",
        summary: "A 45-second explainer on splitting a canteen bill.",
        mode: "invitation",
      },
      { status: "active", review_order: "puzzle_only" },
    ),
  );
  db.assignments.push(
    assignmentOf("asg_004", "cmp_004", {
      fee_amount: rupees(7500),
      payment_status: "payment_pending",
      accepted_at: addDays(t, -20),
    }),
  );
  db.deliverables.push(
    deliverableOf("dlv_007", "asg_004", "script", {
      status: "approved",
      due_at: addDays(t, -14),
      current_owner_kind: "system",
      current_owner_id: null,
    }),
    deliverableOf("dlv_008", "asg_004", "video", {
      status: "approved",
      blocked_by_deliverable_id: "dlv_007",
      due_at: addDays(t, -9),
      current_owner_kind: "system",
      current_owner_id: null,
    }),
    deliverableOf("dlv_009", "asg_004", "live_post", {
      status: "link_verified",
      due_at: addDays(t, -5),
      current_owner_kind: "system",
      current_owner_id: null,
    }),
  );
  db.livePosts.push({
    id: "lvp_001",
    deliverable_id: "dlv_009",
    url: "https://instagram.com/reel/mock-nova-pay",
    platform: "instagram",
    post_id: "mock-nova-pay",
    // Published 3 days ago: the 7-day window has not closed yet.
    published_at: addDays(t, -3),
    proof_ref: null,
    verified_by: "usr_admin",
    verified_at: addDays(t, -3),
  });
  db.metricSnapshots.push(
    {
      id: "mtr_001",
      live_post_id: "lvp_001",
      metric_type: "reach",
      window: "24h",
      value: 14820,
      source: "api",
      captured_at: addDays(t, -2),
      captured_by: null,
      verification_status: "unverified",
      raw_ref: null,
      superseded_by: null,
    },
    {
      id: "mtr_002",
      live_post_id: "lvp_001",
      metric_type: "impressions",
      window: "24h",
      value: 19340,
      source: "api",
      captured_at: addDays(t, -2),
      captured_by: null,
      verification_status: "unverified",
      raw_ref: null,
      superseded_by: null,
    },
    {
      id: "mtr_003",
      live_post_id: "lvp_001",
      metric_type: "engagements",
      window: "24h",
      value: 812,
      source: "api",
      captured_at: addDays(t, -2),
      captured_by: null,
      verification_status: "unverified",
      raw_ref: null,
      superseded_by: null,
    },
  );
  db.earnings.push({
    id: "ern_001",
    assignment_id: "asg_004",
    amount: rupees(7500),
    eligibility_state: "eligible",
    status: "payment_pending",
    status_reason: null,
    gates_met: ["content_approved", "link_verified"],
    updated_by: "usr_admin",
    updated_at: addDays(t, -3),
  });

  /* ── Campaign 5: complete and paid ────────────────────────────────── */
  db.campaigns.push(
    campaignOf(
      {
        id: "cmp_005",
        brandId: "brd_zenfit",
        name: "ZenFit Fresher Week",
        objective: "Awareness during orientation",
        summary: "A day-one-of-college reel with a ZenFit mention.",
        mode: "invitation",
      },
      { status: "completed", review_order: "puzzle_only" },
    ),
  );
  db.assignments.push(
    assignmentOf("asg_005", "cmp_005", {
      participation_status: "completed",
      fee_amount: rupees(5000),
      payment_status: "paid",
      accepted_at: addDays(t, -60),
    }),
  );
  db.deliverables.push(
    deliverableOf("dlv_010", "asg_005", "script", {
      status: "approved",
      due_at: addDays(t, -55),
      current_owner_kind: "system",
      current_owner_id: null,
    }),
    deliverableOf("dlv_011", "asg_005", "video", {
      status: "approved",
      blocked_by_deliverable_id: "dlv_010",
      due_at: addDays(t, -50),
      current_owner_kind: "system",
      current_owner_id: null,
    }),
    deliverableOf("dlv_012", "asg_005", "live_post", {
      status: "link_verified",
      due_at: addDays(t, -45),
      current_owner_kind: "system",
      current_owner_id: null,
    }),
  );
  db.livePosts.push({
    id: "lvp_002",
    deliverable_id: "dlv_012",
    url: "https://instagram.com/reel/mock-fresher-week",
    platform: "instagram",
    post_id: "mock-fresher-week",
    published_at: addDays(t, -44),
    proof_ref: null,
    verified_by: "usr_admin",
    verified_at: addDays(t, -44),
  });
  // 7-day window closed, admin-verified: this is what reporting uses.
  db.metricSnapshots.push(
    {
      id: "mtr_010",
      live_post_id: "lvp_002",
      metric_type: "reach",
      window: "7d",
      value: 31200,
      source: "admin_verified",
      captured_at: addDays(t, -37),
      captured_by: "usr_admin",
      verification_status: "verified",
      raw_ref: null,
      superseded_by: null,
    },
    {
      id: "mtr_011",
      live_post_id: "lvp_002",
      metric_type: "impressions",
      window: "7d",
      value: 44100,
      source: "admin_verified",
      captured_at: addDays(t, -37),
      captured_by: "usr_admin",
      verification_status: "verified",
      raw_ref: null,
      superseded_by: null,
    },
    {
      id: "mtr_012",
      live_post_id: "lvp_002",
      metric_type: "engagements",
      window: "7d",
      value: 2180,
      source: "admin_verified",
      captured_at: addDays(t, -37),
      captured_by: "usr_admin",
      verification_status: "verified",
      raw_ref: null,
      superseded_by: null,
    },
    {
      id: "mtr_013",
      live_post_id: "lvp_002",
      metric_type: "views",
      window: "7d",
      value: 28640,
      source: "creator_submitted",
      captured_at: addDays(t, -37),
      captured_by: CREATOR_ID,
      verification_status: "verified",
      raw_ref: null,
      superseded_by: null,
    },
  );
  db.earnings.push({
    id: "ern_002",
    assignment_id: "asg_005",
    amount: rupees(5000),
    eligibility_state: "eligible",
    status: "paid",
    status_reason: "Settled by bank transfer on 12 Feb.",
    gates_met: ["content_approved", "link_verified", "metrics_submitted", "finance_approved"],
    updated_by: "usr_admin",
    updated_at: addDays(t, -30),
  });

  /* Briefs */
  db.briefVersions = db.campaigns.map((c) => ({
    id: `brf_${c.id}`,
    campaign_id: c.id,
    version: 1,
    content: {
      summary: c.description,
      what_to_make: [
        "One vertical reel, 30 to 45 seconds",
        "Three story frames pointing to the reel",
      ],
      must_include: [
        "Tag the brand handle in the caption",
        "Use the campaign hashtag",
        "Disclose the partnership per ASCI guidelines",
      ],
      must_avoid: [
        "Comparing the brand to competitors by name",
        "Any claim about results or outcomes",
        "Music you do not have rights to",
      ],
      tone: "Warm, specific and honest. Sound like yourself, not an ad.",
      hashtags: ["#ad", "#PuzzleCampus"],
      mentions: ["@" + c.name.toLowerCase().replace(/\s+/g, "")],
      resources: [
        { label: "Brand guidelines (PDF)", url: "#", kind: "doc" },
        { label: "Reference reel", url: "#", kind: "video" },
      ],
    },
    published_at: c.created_at,
    published_by: "usr_admin",
  }));

  /* SLA clocks — one live, one already breached, so both states render. */
  db.slaClocks = [
    {
      id: "sla_001",
      deliverable_id: "dlv_001",
      submission_version_id: "sub_001",
      stage: "puzzle_media",
      started_at: addHours(t, -28),
      due_at: addHours(t, -4),
      paused_at: addHours(t, -4),
      elapsed_seconds: 86_400,
      breached_at: null,
      mode: "calendar_hours",
    },
  ];

  /* Tasks — generated by workflow transitions in production; seeded here. */
  const tasks: Task[] = [
    {
      id: "tsk_001",
      user_id: CREATOR_ID,
      type: "revise_script",
      campaign_id: "cmp_001",
      deliverable_id: "dlv_001",
      status: "open",
      due_at: addHours(t, 20),
      action_required: "Revise your script for ZenFit Campus Fitness Challenge",
      deep_link: "/deliverables/dlv_001",
      created_at: addHours(t, -4),
      closed_at: null,
      closed_reason: null,
    },
    {
      id: "tsk_002",
      user_id: CREATOR_ID,
      type: "accept_invitation",
      campaign_id: "cmp_003",
      deliverable_id: null,
      status: "open",
      due_at: addHours(t, 30),
      action_required: "Respond to the Chai Point invitation",
      deep_link: "/campaigns/cmp_003",
      created_at: addHours(t, -18),
      closed_at: null,
      closed_reason: null,
    },
    {
      id: "tsk_003",
      user_id: CREATOR_ID,
      type: "submit_video",
      campaign_id: "cmp_002",
      deliverable_id: "dlv_004",
      status: "open",
      due_at: addHours(t, 40),
      action_required: "Upload your video for Noise Buds Study Session",
      deep_link: "/deliverables/dlv_004",
      created_at: addDays(t, -3),
      closed_at: null,
      closed_reason: null,
    },
    // Non-campaign task (F-TASK-05): no deliverable, no campaign.
    {
      id: "tsk_004",
      user_id: CREATOR_ID,
      type: "complete_profile",
      campaign_id: null,
      deliverable_id: null,
      status: "open",
      due_at: null,
      action_required: "Add your typical view count to finish your profile",
      deep_link: "/profile",
      created_at: addDays(t, -10),
      closed_at: null,
      closed_reason: null,
    },
  ];
  db.tasks = tasks;

  /* Reviewer-side tasks */
  db.tasks.push({
    id: "tsk_100",
    user_id: REVIEWER_PM_ID,
    type: "review_submission",
    campaign_id: "cmp_001",
    deliverable_id: "dlv_001",
    status: "completed",
    due_at: addHours(t, -6),
    action_required: "Review script v1",
    deep_link: "/reviewer/submissions/sub_001",
    created_at: addHours(t, -28),
    closed_at: addHours(t, -4),
    closed_reason: "Changes requested",
  });

  /* Events */
  db.speakers = [
    {
      id: "spk_001",
      name: "Meera Krishnan",
      title: "Head of Creator Partnerships, Puzzle Media",
      photo: null,
      bio: "Ten years building creator programmes across India. Previously at a national broadcaster.",
      expertise: ["Brand partnerships", "Negotiation", "Content strategy"],
      social_links: ["https://linkedin.com/in/example"],
    },
  ];
  db.events = [
    {
      id: "evt_001",
      type: "workshop",
      title: "Writing a hook that survives the first three seconds",
      description:
        "A working session on openings. Bring a script you are stuck on and leave with a rewrite.",
      format: "online",
      starts_at: addDays(t, 4),
      ends_at: addHours(addDays(t, 4), 1),
      venue: null,
      link: "https://meet.example.com/hooks",
      capacity: 50,
      eligibility_rules: {},
      rsvp_deadline: addDays(t, 3),
      speaker_id: "spk_001",
      resources: [],
    },
    {
      id: "evt_002",
      type: "training",
      title: "Disclosure rules every campus creator should know",
      description:
        "What ASCI actually requires, in plain language, with examples of posts that got it wrong.",
      format: "online",
      starts_at: addDays(t, 12),
      ends_at: addHours(addDays(t, 12), 1),
      venue: null,
      link: "https://meet.example.com/disclosure",
      capacity: 100,
      eligibility_rules: {},
      rsvp_deadline: addDays(t, 10),
      speaker_id: "spk_001",
      resources: [],
    },
  ];
  db.rsvps = [
    {
      id: "rsv_001",
      event_id: "evt_001",
      user_id: CREATOR_ID,
      state: "going",
      created_at: addDays(t, -2),
      checked_in_at: null,
      completed_at: null,
    },
  ];

  /* Notifications — every one deep links to a specific record. */
  db.notifications = [
    {
      id: "ntf_001",
      user_id: CREATOR_ID,
      type: "review_decision",
      title: "Changes requested on your ZenFit script",
      body: "Move the trial mention earlier and drop the competitor comparison.",
      channel: "in_app",
      deep_link: "/deliverables/dlv_001",
      delivered_at: addHours(t, -4),
      read_at: null,
    },
    {
      id: "ntf_002",
      user_id: CREATOR_ID,
      type: "campaign_invite",
      title: "You are invited to Chai Point Monsoon Menu",
      body: "Respond by tomorrow evening to keep your spot.",
      channel: "in_app",
      deep_link: "/campaigns/cmp_003",
      delivered_at: addHours(t, -18),
      read_at: null,
    },
    {
      id: "ntf_003",
      user_id: CREATOR_ID,
      type: "announcement",
      title: "New workshop: writing better hooks",
      body: "Thursday, 6pm. Fifty seats.",
      channel: "in_app",
      deep_link: "/learn",
      delivered_at: addDays(t, -2),
      read_at: addDays(t, -2),
    },
    {
      id: "ntf_004",
      user_id: CREATOR_ID,
      type: "earnings_update",
      title: "Nova Pay moved to Pending Payment",
      body: "Your live link was verified. Payment is being processed by Puzzle Media.",
      channel: "in_app",
      deep_link: "/earnings",
      delivered_at: addDays(t, -3),
      read_at: addDays(t, -3),
    },
  ];

  db.announcements = [
    {
      id: "anc_001",
      author_id: "usr_admin",
      type: "platform",
      title: "Results now settle after 7 days",
      body: "We now read your numbers a week after you post, so late views are counted. Nothing for you to do.",
      segment_rules: {},
      scheduled_for: null,
      sent_at: addDays(t, -6),
    },
  ];

  return db;
}
