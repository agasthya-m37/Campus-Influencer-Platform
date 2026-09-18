/**
 * The typed API surface, mirroring PRD §8.1 one to one.
 *
 * Contains no mock logic: it builds request descriptors and hands them to the
 * transport. Features import only this. When the real backend lands, this
 * file does not change.
 */

import { transport, type ApiRequest } from "@/lib/api/transport";
import type {
  Announcement,
  AppNotification,
  AuditLog,
  Brand,
  Campaign,
  CampaignAssignment,
  CampaignBriefVersion,
  CampusEvent,
  Consent,
  CreatorProfile,
  Deliverable,
  Earning,
  Id,
  LivePost,
  MetricSnapshot,
  MetricType,
  MetricWindow,
  RejectReasonCode,
  Review,
  ReviewDecision,
  ReviewStage,
  Rsvp,
  SlaClock,
  SocialAccount,
  Speaker,
  SubmissionVersion,
  Task,
  User,
} from "@/lib/types";
import type { DraftBudget } from "@/lib/domain/deliverables";
import type { DecisionOutcome } from "@/lib/domain/review";

export interface RequestOptions {
  signal?: AbortSignal;
  /** Held across retries so a double-tap cannot create two records. */
  idempotencyKey?: string;
}

async function call<T>(req: ApiRequest): Promise<T> {
  const { data } = await transport<T>(req);
  return data;
}

function get<T>(path: string, opts: RequestOptions = {}) {
  return call<T>({ method: "GET", path, signal: opts.signal });
}

function post<T>(path: string, body?: unknown, opts: RequestOptions = {}) {
  return call<T>({
    method: "POST",
    path,
    body,
    signal: opts.signal,
    idempotencyKey: opts.idempotencyKey,
  });
}

function patch<T>(path: string, body?: unknown, opts: RequestOptions = {}) {
  return call<T>({
    method: "PATCH",
    path,
    body,
    signal: opts.signal,
    idempotencyKey: opts.idempotencyKey,
  });
}

/* ── response shapes ────────────────────────────────────────────────── */

export interface MeResponse {
  user: User;
  profile: CreatorProfile | null;
  socialAccounts: SocialAccount[];
  consents: Consent[];
}

export interface CampaignListItem {
  assignment: CampaignAssignment;
  campaign: Campaign;
  brand: Brand;
  deliverables: Deliverable[];
}

export interface CampaignDetail {
  campaign: Campaign;
  brand: Brand;
  assignment: CampaignAssignment | null;
  deliverables: Deliverable[];
  brief: CampaignBriefVersion;
}

export interface DeliverableDetail {
  deliverable: Deliverable;
  assignment: CampaignAssignment;
  campaign: Campaign;
  brand: Brand;
  brief: CampaignBriefVersion;
  versions: SubmissionVersion[];
  reviews: Review[];
  slaClocks: SlaClock[];
  blocker: Deliverable | null;
  livePost: LivePost | null;
  budget: DraftBudget;
}

export interface ReviewQueueItem {
  deliverable: Deliverable;
  campaign: Campaign;
  brand: Brand;
  creator: CreatorProfile;
  version: SubmissionVersion;
  versions: SubmissionVersion[];
  reviews: Review[];
  slaClock: SlaClock | null;
  stage: ReviewStage;
}

export interface ReviewDetail {
  version: SubmissionVersion;
  versions: SubmissionVersion[];
  deliverable: Deliverable;
  assignment: CampaignAssignment;
  campaign: Campaign;
  brand: Brand;
  creator: CreatorProfile;
  socialAccounts: SocialAccount[];
  brief: CampaignBriefVersion;
  reviews: Review[];
  slaClocks: SlaClock[];
  stage: ReviewStage;
  budget: DraftBudget;
}

export interface EarningRow {
  assignment: CampaignAssignment;
  earning: Earning | null;
  campaign: Campaign;
  brand: Brand;
}

export interface PerformanceRow {
  livePost: LivePost;
  campaign: Campaign;
  brand: Brand;
  snapshots: MetricSnapshot[];
}

export interface EventRow {
  event: CampusEvent;
  speaker: Speaker | null;
  rsvp: Rsvp | null;
  goingCount: number;
}

export interface AdminOverview {
  pendingReview: number;
  unverifiedLinks: number;
  openBreaches: number;
  pendingProfiles: number;
  metricsOutstanding: number;
  creators: number;
  campaigns: number;
  brands: number;
}

/* ── the client ─────────────────────────────────────────────────────── */

export const api = {
  auth: {
    requestOtp: (phone: string, opts?: RequestOptions) =>
      post<{ sent: boolean; expiresInSeconds: number; resendAfterSeconds: number; hint: string }>(
        "/auth/otp/request",
        { phone },
        opts,
      ),
    verifyOtp: (phone: string, code: string, opts?: RequestOptions) =>
      post<{ user: User; needsOnboarding: boolean }>(
        "/auth/otp/verify",
        { phone, code },
        opts,
      ),
    /** Email and password, per the backend's auth_user model. */
    login: (email: string, password: string, opts?: RequestOptions) =>
      post<{ user: User; needsOnboarding: boolean }>(
        "/auth/password/login",
        { email, password },
        opts,
      ),
    /** Creates a creator account and signs them in, ready for onboarding. */
    signup: (
      input: { fullName: string; email: string; phone: string; password: string },
      opts?: RequestOptions,
    ) =>
      post<{ user: User; needsOnboarding: boolean }>("/auth/signup", input, opts),
    forgotPassword: (email: string, opts?: RequestOptions) =>
      post<{ sent: boolean }>("/auth/password/forgot", { email }, opts),
    logout: (opts?: RequestOptions) => post<{ ok: true }>("/auth/logout", {}, opts),
    /** Dev affordance so all three portals are walkable without real auth. */
    switchUser: (userId: Id, opts?: RequestOptions) =>
      post<{ ok: true }>("/auth/switch-user", { userId }, opts),
  },

  me: {
    get: (opts?: RequestOptions) => get<MeResponse>("/me", opts),
    saveDraft: (
      step: string,
      values: Record<string, unknown>,
      opts?: RequestOptions,
    ) => patch<{ savedAt: string }>("/me/profile", { step, values }, opts),
    getDraft: (opts?: RequestOptions) =>
      get<{ step: string; values: Record<string, unknown>; savedAt: string } | null>(
        "/me/profile/draft",
        opts,
      ),
    submitProfile: (opts?: RequestOptions) =>
      post<CreatorProfile>("/me/profile/submit", {}, opts),
  },

  campaigns: {
    list: (opts?: RequestOptions) =>
      get<{ items: CampaignListItem[]; nextCursor: string | null }>("/campaigns", opts),
    get: (id: Id, opts?: RequestOptions) => get<CampaignDetail>(`/campaigns/${id}`, opts),
  },

  assignments: {
    accept: (id: Id, opts?: RequestOptions) =>
      post<CampaignAssignment>(`/assignments/${id}/accept`, {}, opts),
    decline: (id: Id, reason: string, opts?: RequestOptions) =>
      post<CampaignAssignment>(`/assignments/${id}/decline`, { reason }, opts),
    withdraw: (id: Id, reason: string, opts?: RequestOptions) =>
      post<CampaignAssignment>(`/assignments/${id}/withdraw`, { reason }, opts),
  },

  deliverables: {
    get: (id: Id, opts?: RequestOptions) =>
      get<DeliverableDetail>(`/deliverables/${id}`, opts),
    createSubmission: (
      id: Id,
      input: {
        content?: string | null;
        externalLink?: string | null;
        fileRefs?: SubmissionVersion["file_refs"];
      },
      opts?: RequestOptions,
    ) =>
      post<{ version: SubmissionVersion; quarantined: boolean }>(
        `/deliverables/${id}/submissions`,
        input,
        opts,
      ),
    submitLivePost: (
      id: Id,
      input: { url: string; publishedAt: string; proof?: unknown },
      opts?: RequestOptions,
    ) => post<LivePost>(`/deliverables/${id}/live-post`, input, opts),
    grantRound: (id: Id, reason: string, opts?: RequestOptions) =>
      post<Deliverable>(`/deliverables/${id}/grant-round`, { reason }, opts),
  },

  submissions: {
    versions: (id: Id, opts?: RequestOptions) =>
      get<SubmissionVersion[]>(`/submissions/${id}/versions`, opts),
    review: (
      id: Id,
      input: {
        stage: ReviewStage;
        decision: ReviewDecision;
        feedback: string;
        reasonCode?: RejectReasonCode | null;
        internalNote?: string | null;
        endsParticipation?: boolean;
      },
      opts?: RequestOptions,
    ) =>
      post<{ review: Review; outcome: DecisionOutcome }>(
        `/submissions/${id}/review`,
        input,
        opts,
      ),
  },

  livePosts: {
    verify: (id: Id, opts?: RequestOptions) =>
      post<LivePost>(`/live-posts/${id}/verify`, {}, opts),
    submitMetrics: (
      id: Id,
      metrics: Partial<Record<MetricType, number>>,
      window: MetricWindow = "7d",
      opts?: RequestOptions,
    ) => post<MetricSnapshot[]>(`/live-posts/${id}/metrics`, { metrics, window }, opts),
  },

  metrics: {
    verify: (id: Id, input: { value?: number; reason?: string }, opts?: RequestOptions) =>
      post<MetricSnapshot>(`/metrics/${id}/verify`, input, opts),
  },

  tasks: {
    list: (opts?: RequestOptions) => get<Task[]>("/tasks", opts),
  },

  notifications: {
    list: (opts?: RequestOptions) => get<AppNotification[]>("/notifications", opts),
    markRead: (id: Id, opts?: RequestOptions) =>
      post<AppNotification>(`/notifications/${id}/read`, {}, opts),
    markAllRead: (opts?: RequestOptions) =>
      post<{ ok: true }>("/notifications/read-all", {}, opts),
  },

  earnings: {
    list: (opts?: RequestOptions) => get<{ items: EarningRow[] }>("/earnings", opts),
  },

  performance: {
    list: (opts?: RequestOptions) => get<{ items: PerformanceRow[] }>("/performance", opts),
  },

  events: {
    list: (opts?: RequestOptions) => get<{ items: EventRow[] }>("/events", opts),
    rsvp: (id: Id, opts?: RequestOptions) => post<Rsvp>(`/events/${id}/rsvp`, {}, opts),
  },

  reviewer: {
    queue: (opts?: RequestOptions) =>
      get<{ items: ReviewQueueItem[]; stage: ReviewStage }>("/reviewer/queue", opts),
    submission: (id: Id, opts?: RequestOptions) =>
      get<ReviewDetail>(`/reviewer/submissions/${id}`, opts),
  },

  admin: {
    overview: (opts?: RequestOptions) => get<AdminOverview>("/admin/overview", opts),
    creators: (opts?: RequestOptions) =>
      get<{
        items: Array<{
          profile: CreatorProfile;
          user: User;
          socialAccounts: SocialAccount[];
          assignments: number;
        }>;
      }>("/admin/creators", opts),
    slaQueue: (opts?: RequestOptions) =>
      get<{
        items: Array<{
          clock: SlaClock;
          deliverable: Deliverable;
          campaign: Campaign;
          creator: CreatorProfile;
        }>;
      }>("/admin/queue/sla", opts),
    livePosts: (opts?: RequestOptions) =>
      get<{
        items: Array<{ livePost: LivePost; campaign: Campaign; creator: CreatorProfile }>;
      }>("/admin/live-posts", opts),
    earnings: (opts?: RequestOptions) =>
      get<{
        items: Array<{
          earning: Earning;
          assignment: CampaignAssignment;
          campaign: Campaign;
          brand: Brand;
          creator: CreatorProfile;
        }>;
      }>("/admin/earnings", opts),
    audit: (opts?: RequestOptions) => get<{ items: AuditLog[] }>("/admin/audit", opts),
  },

  announcements: {
    list: (opts?: RequestOptions) => get<Announcement[]>("/announcements", opts),
  },
};
