/**
 * Domain entities, per PRD §6.
 *
 * Column names follow the PRD so that when a real backend lands, the mapping
 * is nominal rather than interpretive. Nothing here imports anything: these
 * are pure types with zero runtime cost.
 */

import type { Iso } from "@/lib/format/datetime";
import type { Paise } from "@/lib/format/currency";

export type Id = string;

/* ── Identity and access ────────────────────────────────────────────── */

/**
 * The permission architecture carries five roles even though fewer appear in
 * the UI, because adding a permission set later is cheap and retrofitting
 * role separation into a written access layer is not.
 *
 * Shipping now: `creator`, `brand_reviewer`, `super_admin`. Puzzle Media
 * reviews content from the admin console rather than a separate reviewer
 * portal, so `campaign_manager` exists in the model but has no UI yet.
 */
export type Role =
  | "creator"
  | "brand_reviewer"
  | "brand_admin"
  | "campaign_manager"
  | "super_admin";

/** F-IAM-06. Suspended and rejected users cannot authenticate, and the
 *  login response does not distinguish which. */
export type UserStatus =
  | "pending_review"
  | "active"
  | "information_requested"
  | "waitlisted"
  | "rejected"
  | "suspended";

export interface User {
  id: Id;
  role: Role;
  status: UserStatus;
  phone: string;
  email: string | null;
  phone_verified_at: Iso | null;
  email_verified_at: Iso | null;
  timezone: string;
  last_active_at: Iso | null;
  /** Brand users only; scopes everything they can reach. */
  brand_id: Id | null;
}

/** F-ONB-05. Each declaration is a separate, insert-only record. */
export type ConsentType =
  | "terms"
  | "privacy"
  | "content_usage"
  | "age_eligibility";

export interface Consent {
  id: Id;
  user_id: Id;
  type: ConsentType;
  document_version: string;
  accepted_at: Iso;
  ip: string;
  user_agent: string;
}

/* ── Creator profile ────────────────────────────────────────────────── */

/** F-ONB-08 / D3: no identity documents exist in the Phase 1 schema.
 *  There is deliberately no college_id_ref, aadhaar, or pan field here. */
export interface CreatorProfile {
  id: Id;
  user_id: Id;
  display_name: string;
  photo: string | null;
  dob: string | null;
  college_id: Id | null;
  city_id: Id | null;
  course: string | null;
  year: number | null;
  grad_year: number | null;
  bio: string | null;
  languages: Id[];
  categories: Id[];
  formats: string[];
  availability: string | null;
  brand_preferences: Id[];
  completeness_score: number;
  verification_status: UserStatus;
  submitted_at: Iso | null;
  reviewed_at: Iso | null;
  review_note: string | null;
}

export type Platform = "instagram" | "youtube" | "linkedin" | "x";

/** F-IAM-09. account_type decides whether automated refresh is possible
 *  at all — personal accounts return nothing and there is no workaround. */
export type AccountType = "personal" | "business" | "creator";

export interface SocialAccount {
  id: Id;
  creator_id: Id;
  platform: Platform;
  handle: string;
  url: string;
  followers: number;
  typical_views: number | null;
  engagement_rate: number | null;
  account_type: AccountType;
  auth_state: "not_connected" | "connected" | "expired" | "revoked";
  token_ref: string | null;
  last_refreshed_at: Iso | null;
  /** Surfaced rather than silently serving stale numbers. */
  refresh_error: string | null;
}

/* ── Brand and campaign ─────────────────────────────────────────────── */

export interface Brand {
  id: Id;
  name: string;
  logo: string | null;
  guidelines_ref: string | null;
  status: "active" | "archived";
}

export type CampaignStatus =
  | "draft"
  | "published"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "archived";

export type ParticipationMode =
  | "invitation"
  | "open_application"
  | "direct_assignment";

/** D4. Order is a configurable property from day one even though only one
 *  value ships, because hardcoding it makes handing review to brands a rebuild. */
export type ReviewOrder = "puzzle_then_brand" | "brand_only" | "puzzle_only";

export interface Campaign {
  id: Id;
  brand_id: Id;
  name: string;
  objective: string;
  description: string;
  image: string | null;
  participation_mode: ParticipationMode;
  status: CampaignStatus;
  eligibility_rules: EligibilityRules;
  reveal_commercials_to_reviewer: boolean;
  revision_limit: number;
  review_order: ReviewOrder;
  /** F-CAM-11: a campaign is configured and holds assignments before the
   *  brand has an account. Null means the brand cannot see it yet. */
  brand_visible_from: Iso | null;
  sla_profile_id: Id;
  timezone: string;
  brief_version: number;
  accept_by: Iso | null;
  go_live_from: Iso | null;
  go_live_to: Iso | null;
  created_at: Iso;
}

export interface EligibilityRules {
  cities?: Id[];
  colleges?: Id[];
  categories?: Id[];
  languages?: Id[];
  platforms?: Platform[];
  min_followers?: number;
  max_followers?: number;
}

export interface CampaignBriefVersion {
  id: Id;
  campaign_id: Id;
  version: number;
  content: BriefContent;
  published_at: Iso;
  published_by: Id;
}

export interface BriefContent {
  summary: string;
  what_to_make: string[];
  must_include: string[];
  must_avoid: string[];
  tone: string;
  hashtags: string[];
  mentions: string[];
  resources: BriefResource[];
}

export interface BriefResource {
  label: string;
  url: string;
  kind: "doc" | "image" | "video" | "link";
}

export interface CampaignReviewer {
  campaign_id: Id;
  user_id: Id;
  /** Position in the review chain: 1 = Puzzle Media, 2 = brand. */
  sequence: number;
  can_reassign: boolean;
}

/* ── Participation ──────────────────────────────────────────────────── */

/**
 * Three state machines on one discriminator (§5.6.1a). Expired is distinct
 * from Declined: a creator who never saw an invitation has not refused it,
 * and conflating them corrupts any future reliability metric.
 */
export type ParticipationStatus =
  // invitation
  | "invited"
  | "expired"
  // open application
  | "applied"
  | "shortlisted"
  | "selected"
  | "not_selected"
  // direct assignment
  | "assigned"
  | "acknowledged"
  // shared
  | "accepted"
  | "declined"
  | "active"
  | "withdrawn"
  | "removed"
  | "completed";

export type PaymentStatus =
  | "not_eligible"
  | "payment_pending"
  | "approved_for_payment"
  | "paid";

export interface CampaignAssignment {
  id: Id;
  campaign_id: Id;
  creator_id: Id;
  participation_status: ParticipationStatus;
  fee_amount: Paise | null;
  fee_currency: "INR";
  barter_value: Paise | null;
  visible_to_creator: boolean;
  invited_at: Iso | null;
  accept_by: Iso | null;
  accepted_at: Iso | null;
  withdrawn_at: Iso | null;
  withdrawn_reason: string | null;
  payment_status: PaymentStatus;
  /** Set when this assignment replaced another creator's (F-CAM-12). */
  replaces_assignment_id: Id | null;
}

/* ── Deliverables and submissions ───────────────────────────────────── */

export type DeliverableType = "script" | "video" | "live_post";

export type DeliverableStatus =
  | "not_started"
  | "blocked"
  | "in_production"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "live_link_submitted"
  | "link_verified";

export type OwnerKind = "creator" | "reviewer" | "puzzle_media" | "brand" | "system";

export interface Deliverable {
  id: Id;
  assignment_id: Id;
  type: DeliverableType;
  quantity: number;
  requirements: string;
  due_at: Iso;
  status: DeliverableStatus;
  current_owner_kind: OwnerKind;
  current_owner_id: Id | null;
  /** Since when the current owner has been blocking. */
  owner_since: Iso;
  /** F-SUB-07: video is gated on the linked script reaching approved. */
  blocked_by_deliverable_id: Id | null;
  /** Per-campaign override of the draft cap; falls back to campaign. */
  revision_limit: number;
  /** Set when a super admin grants another round past the cap. */
  extra_rounds_granted: number;
}

export type ScanStatus = "pending" | "clean" | "infected" | "skipped";

export interface SubmissionVersion {
  id: Id;
  deliverable_id: Id;
  version_no: number;
  content: string | null;
  file_refs: FileRef[];
  external_link: string | null;
  submitted_by: Id;
  submitted_at: Iso;
  scan_status: ScanStatus;
  /** F-SUB-09: on approval the version freezes and files become read-only. */
  is_locked: boolean;
}

export interface FileRef {
  id: Id;
  name: string;
  size: number;
  mime: string;
  /** blob: URL in the mock; an object-storage key in production. */
  url: string;
  scan_status: ScanStatus;
}

export type ReviewDecision = "approve" | "request_changes" | "reject";

/** Which stage of the chain a review belongs to (D4). */
export type ReviewStage = "puzzle_media" | "brand";

export type RejectReasonCode =
  | "off_brief"
  | "quality"
  | "brand_safety"
  | "guideline_breach"
  | "plagiarism"
  | "other";

export interface Review {
  id: Id;
  submission_version_id: Id;
  reviewer_id: Id;
  stage: ReviewStage;
  decision: ReviewDecision;
  /** F-SUB-08: mandatory, min 10 chars, on changes and reject. */
  feedback: string;
  reason_code: RejectReasonCode | null;
  internal_note: string | null;
  /** Reviewer's explicit choice at reject time. */
  ends_participation: boolean;
  decided_at: Iso;
}

export interface Comment {
  id: Id;
  submission_version_id: Id;
  author_id: Id;
  body: string;
  visibility: "all" | "internal";
  created_at: Iso;
  resolved_at: Iso | null;
}

/* ── SLA ────────────────────────────────────────────────────────────── */

export interface SlaClock {
  id: Id;
  deliverable_id: Id;
  submission_version_id: Id;
  stage: ReviewStage;
  started_at: Iso;
  due_at: Iso;
  paused_at: Iso | null;
  elapsed_seconds: number;
  breached_at: Iso | null;
  mode: "calendar_hours" | "business_hours";
}

/* ── Publishing and metrics ─────────────────────────────────────────── */

export interface LivePost {
  id: Id;
  deliverable_id: Id;
  url: string;
  platform: Platform;
  post_id: string | null;
  published_at: Iso;
  /** Optional per the product decision: URL and timestamp are required,
   *  a proof screenshot is encouraged but not mandatory. */
  proof_ref: FileRef | null;
  verified_by: Id | null;
  verified_at: Iso | null;
}

export type MetricType =
  | "reach"
  | "impressions"
  | "views"
  | "likes"
  | "comments"
  | "shares"
  | "saves"
  | "engagements";

/** F-REP-01. Provenance is carried on every snapshot, always displayed. */
export type MetricSource =
  | "api"
  | "creator_submitted"
  | "admin_verified"
  | "manual_import";

/** D13 — 7 days is the reporting figure; 24h and 30d are also captured. */
export type MetricWindow = "24h" | "7d" | "30d";

export interface MetricSnapshot {
  id: Id;
  live_post_id: Id;
  metric_type: MetricType;
  window: MetricWindow;
  value: number;
  source: MetricSource;
  captured_at: Iso;
  captured_by: Id | null;
  verification_status: "unverified" | "verified" | "corrected";
  raw_ref: string | null;
  /** Corrections insert a new row; the original is retained. */
  superseded_by: Id | null;
}

/* ── Events and comms ───────────────────────────────────────────────── */

export interface Speaker {
  id: Id;
  name: string;
  title: string;
  photo: string | null;
  bio: string;
  expertise: string[];
  social_links: string[];
}

export interface CampusEvent {
  id: Id;
  type: "workshop" | "webinar" | "meetup" | "training";
  title: string;
  description: string;
  format: "online" | "in_person";
  starts_at: Iso;
  ends_at: Iso;
  venue: string | null;
  link: string | null;
  capacity: number;
  eligibility_rules: EligibilityRules;
  rsvp_deadline: Iso;
  speaker_id: Id | null;
  resources: BriefResource[];
  /** Cover image for the event card. Null falls back to an icon treatment. */
  image: string | null;
}

export type RsvpState =
  | "invited"
  | "going"
  | "waitlisted"
  | "cancelled"
  | "attended"
  | "no_show";

export interface Rsvp {
  id: Id;
  event_id: Id;
  user_id: Id;
  state: RsvpState;
  created_at: Iso;
  checked_in_at: Iso | null;
  completed_at: Iso | null;
}

export type NotificationType =
  | "campaign_invite"
  | "brief_updated"
  | "review_decision"
  | "task_due"
  | "task_overdue"
  | "announcement"
  | "event_invite"
  | "metrics_due"
  | "earnings_update";

export interface AppNotification {
  id: Id;
  user_id: Id;
  type: NotificationType;
  title: string;
  body: string;
  channel: "in_app";
  /** F-DASH-06: every notification resolves to a specific screen and record. */
  deep_link: string;
  delivered_at: Iso;
  read_at: Iso | null;
}

export interface Announcement {
  id: Id;
  author_id: Id;
  type: "platform" | "campaign" | "event";
  title: string;
  body: string;
  segment_rules: EligibilityRules;
  scheduled_for: Iso | null;
  sent_at: Iso | null;
}

/* ── Earnings, tasks, audit ─────────────────────────────────────────── */

/** F-EARN. Produces a report, not a transaction. */
export interface Earning {
  id: Id;
  assignment_id: Id;
  amount: Paise;
  eligibility_state: "not_eligible" | "eligible";
  status: PaymentStatus;
  status_reason: string | null;
  gates_met: EarningGate[];
  updated_by: Id | null;
  updated_at: Iso;
}

export type EarningGate =
  | "content_approved"
  | "link_verified"
  | "metrics_submitted"
  | "finance_approved";

export type TaskType =
  | "submit_script"
  | "revise_script"
  | "submit_video"
  | "revise_video"
  | "accept_invitation"
  | "publish_post"
  | "submit_live_link"
  | "submit_metrics"
  | "complete_profile"
  | "confirm_event"
  | "review_submission";

export type TaskStatus = "open" | "completed" | "superseded" | "cancelled";

/**
 * F-TASK-01. A task is a first-class object, not a filtered view of
 * deliverables — deliverable_id is nullable precisely so profile completion
 * and event confirmation can be tasks too.
 */
export interface Task {
  id: Id;
  user_id: Id;
  type: TaskType;
  campaign_id: Id | null;
  deliverable_id: Id | null;
  status: TaskStatus;
  due_at: Iso | null;
  action_required: string;
  deep_link: string;
  created_at: Iso;
  closed_at: Iso | null;
  closed_reason: string | null;
}

export interface AuditLog {
  id: Id;
  actor_id: Id;
  impersonator_id: Id | null;
  action: string;
  entity_type: string;
  entity_id: Id;
  before_ref: string | null;
  after_ref: string | null;
  reason: string | null;
  at: Iso;
  ip: string | null;
  user_agent: string | null;
}

/* ── Taxonomy ───────────────────────────────────────────────────────── */

export interface TaxonomyItem {
  id: Id;
  kind: "city" | "college" | "category" | "language" | "tag";
  name: string;
  parent_id: Id | null;
  deprecated: boolean;
}
