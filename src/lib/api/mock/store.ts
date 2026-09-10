/**
 * The mock database.
 *
 * A normalized in-memory store with an emitter, hydrated from localStorage so
 * a refresh mid-onboarding genuinely resumes rather than merely claiming to.
 * Hooks subscribe through `useSyncExternalStore`, which is why there is no
 * second cache to fall out of sync with this one.
 */

import type {
  Announcement,
  AppNotification,
  AuditLog,
  Brand,
  Campaign,
  CampaignAssignment,
  CampaignBriefVersion,
  CampaignReviewer,
  CampusEvent,
  Comment,
  Consent,
  CreatorProfile,
  Deliverable,
  Earning,
  Id,
  LivePost,
  MetricSnapshot,
  Review,
  Rsvp,
  SlaClock,
  SocialAccount,
  Speaker,
  SubmissionVersion,
  Task,
  TaxonomyItem,
  User,
} from "@/lib/types";

/** Bump when the fixture shape changes, so stale data cannot crash a reload. */
const STORAGE_KEY = "pmcip.mock.v1";

export interface Database {
  users: User[];
  consents: Consent[];
  creatorProfiles: CreatorProfile[];
  socialAccounts: SocialAccount[];
  brands: Brand[];
  campaigns: Campaign[];
  briefVersions: CampaignBriefVersion[];
  campaignReviewers: CampaignReviewer[];
  assignments: CampaignAssignment[];
  deliverables: Deliverable[];
  submissionVersions: SubmissionVersion[];
  reviews: Review[];
  comments: Comment[];
  slaClocks: SlaClock[];
  livePosts: LivePost[];
  metricSnapshots: MetricSnapshot[];
  events: CampusEvent[];
  speakers: Speaker[];
  rsvps: Rsvp[];
  notifications: AppNotification[];
  announcements: Announcement[];
  earnings: Earning[];
  tasks: Task[];
  auditLog: AuditLog[];
  taxonomy: TaxonomyItem[];
  /** Draft profile state for the onboarding wizard's auto-save. */
  profileDrafts: Record<Id, { step: string; values: Record<string, unknown>; savedAt: string }>;
  session: { userId: Id | null };
}

export function emptyDatabase(): Database {
  return {
    users: [],
    consents: [],
    creatorProfiles: [],
    socialAccounts: [],
    brands: [],
    campaigns: [],
    briefVersions: [],
    campaignReviewers: [],
    assignments: [],
    deliverables: [],
    submissionVersions: [],
    reviews: [],
    comments: [],
    slaClocks: [],
    livePosts: [],
    metricSnapshots: [],
    events: [],
    speakers: [],
    rsvps: [],
    notifications: [],
    announcements: [],
    earnings: [],
    tasks: [],
    auditLog: [],
    taxonomy: [],
    profileDrafts: {},
    session: { userId: null },
  };
}

type Listener = () => void;

class MockStore {
  private db: Database = emptyDatabase();
  private listeners = new Set<Listener>();
  private hydrated = false;
  private seeded = false;
  /** Bumped on every mutation; the snapshot identity hooks compare against. */
  private version = 0;

  /** Seeder, injected to avoid a circular import with seed/. */
  private seeder: (() => Database) | null = null;

  registerSeeder(fn: () => Database) {
    this.seeder = fn;
  }

  /**
   * Hydration is explicit and client-only. Server renders see the seed, which
   * keeps the first paint deterministic; the client reconciles on mount.
   */
  hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;

    let restored: Database | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) restored = JSON.parse(raw) as Database;
      } catch {
        // Corrupt or unavailable storage: fall through to a fresh seed.
        restored = null;
      }
    }

    if (restored) {
      this.db = restored;
    } else if (!this.seeded) {
      this.db = this.seeder?.() ?? emptyDatabase();
    }
    this.seeded = true;
    this.version += 1;
    this.emit();
  }

  reset() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Nothing to clear.
      }
    }
    this.db = this.seeder?.() ?? emptyDatabase();
    this.seeded = true;
    this.version += 1;
    this.emit();
  }

  /**
   * Read-only view. Callers must not mutate the returned object.
   *
   * Seeds on first read so a server render has real content rather than an
   * empty shell — an empty first paint costs us the 3s budget and reads as
   * broken. `hydrate()` later reconciles against localStorage on the client.
   */
  read(): Database {
    if (!this.seeded && this.seeder) {
      this.db = this.seeder();
      this.seeded = true;
    }
    return this.db;
  }

  /** The single write path. Every mutation persists and notifies. */
  write<T>(fn: (db: Database) => T): T {
    const result = fn(this.db);
    this.version += 1;
    this.persist();
    this.emit();
    return result;
  }

  getVersion() {
    return this.version;
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      // Quota or private mode: the app still works, it just will not resume.
    }
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

export const store = new MockStore();

/* ── helpers ────────────────────────────────────────────────────────── */

let counter = 0;

/** Deterministic-ish ids. Seeded records use fixed ids so links are stable. */
export function newId(prefix: string): Id {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
