# Admin — Creators

**Track B.** Routes: `/admin/creators`, `/admin/creators/[id]`,
`/admin/creators/applications`.

The roster, and the gate into it.

---

## Why this screen exists

Two jobs that share a data model but not a rhythm.

**The directory** is a lookup: an operator building a campaign needs to find
creators by college, city, category, follower band. Used constantly, always
in service of something else.

**The application queue** is a decision: every application is reviewed by a
person, and there is no automatic rejection. Used in batches, and the outcome
matters to a nineteen-year-old waiting to hear back.

Keep them as separate screens. Merging them makes the directory noisy and
buries the queue.

---

## 1. Directory — `/admin/creators`

The table exists today in `features/admin/admin-screens.tsx`. Move it to
`features/admin/creators-screen.tsx` when you touch it, and extend.

### Filters

A filter bar above the table. Every filter narrows; they combine with AND.

| Filter | Control |
|---|---|
| Search | Text, matches name and handle |
| College | multi-select |
| City | multi-select |
| Category | multi-select |
| Language | multi-select |
| Platform | select |
| Followers | min / max numeric |
| Account type | personal / creator / business |
| Profile status | pending, active, waitlisted, rejected, suspended |

Show an active-filter count and a **Clear all** action. Saved filters are a
later addition; leave a place for them.

### Columns

| Column | Content |
|---|---|
| Creator | Name, phone beneath in muted text |
| College | College and year |
| Followers | Primary account, `formatCompact`, `tabular` |
| Account type | `Badge`. Personal is `secondary`, creator and business are `default`. |
| Campaigns | Count, `tabular` |
| Status | `StatusPill` |

**Account type earns its column.** It decides whether metrics can sync
automatically at all — personal accounts return nothing from the API and there
is no workaround — so an operator picking creators for a campaign needs it
visible without opening each profile.

### Bulk actions

Checkbox column, with a bar appearing when anything is selected showing the
count and the available actions: invite to campaign, tag, export.

Every bulk action requires **typed confirmation** (the operator types the
count or the word), is **capped per invocation**, runs as a **background job
with a result report**, and writes **one audit entry per affected record**. A
bulk action that half-succeeds silently is worse than one that refuses.

---

## 2. Creator detail — `/admin/creators/[id]`

### Header

Name as `h1`, college and course beneath, `StatusPill` for profile status, and
actions: message, invite to campaign, suspend (reason required).

### Sections

**Profile** — photo, bio, languages, categories, formats, availability, city,
graduation year, completeness score with a `Progress` bar.

**Accounts** — each social account as a row: platform, handle via
`formatHandle`, followers, typical views, engagement rate, account type badge,
connection state, and last refresh time. If `refresh_error` is set, surface it
rather than silently serving stale numbers.

**Campaign history** — every assignment: campaign, brand, participation
status, deliverable outcomes, fee, dates. This is where an operator answers
"is this creator reliable", so include withdrawals and expired invitations
distinctly. **Expired is not Declined**: a creator who never saw an invitation
has not refused it, and conflating them corrupts any reliability read.

**Performance** — aggregate reach, engagement rate and posts delivered, each
with source and denominator labels via `MetricTile`.

**Consent records** — the four declarations with version, timestamp, IP and
user agent. Read-only, append-only.

**Notes** — internal, never visible to the creator.

---

## 3. Application queue — `/admin/creators/applications`

### Layout

A queue, not a table. Each application is a card carrying enough to decide
without opening a detail view: name, college, course, year, primary account
with follower count and account type, categories, and the bio.

Sort oldest first — an application waiting eight days matters more than one
from this morning. Show the wait time on each card.

### Decisions

Five actions, each writing an audit entry:

| Action | Requires | Effect |
|---|---|---|
| **Approve** | — | Status → active. Creator can be invited to campaigns. |
| **Request information** | Message, required | Status → information_requested. Creator sees what is missing. |
| **Waitlist** | Optional note | Status → waitlisted. **The default for creators below threshold.** Stays searchable and can be promoted later without reapplying. |
| **Reject** | Reason, required | **Reserved for spam and bot accounts.** Not for "too few followers" — that is a waitlist. |
| **Suspend** | Reason, required | For an existing creator who breached something. |

Make the waitlist action visually equal to approve, not a lesser option. If
reject is the easiest button to reach, it will be over-used on students who
merely have a small following.

### States

- **Empty**: "No applications waiting" with a note that new ones appear as
  students sign up.
- **After a decision**: the card leaves the queue with a brief toast naming
  the outcome, and the count decrements.

---

## Endpoints needed

```ts
api.admin.creators.list(filter?: {
  q?: string; collegeIds?: string[]; cityIds?: string[];
  categoryIds?: string[]; languageIds?: string[]; platform?: Platform;
  minFollowers?: number; maxFollowers?: number;
  accountType?: AccountType; status?: UserStatus;
}) // → { items, total }

api.admin.creators.get(id)
  // → { profile, user, socialAccounts, consents, assignments, performance }

api.admin.creators.applications()
  // → { items: Array<{ profile, user, socialAccounts, waitingDays }> }

api.admin.creators.decide(id, {
  decision: "approve" | "request_info" | "waitlist" | "reject" | "suspend";
  reason?: string;      // required for request_info, reject, suspend
}) // → CreatorProfile

api.admin.creators.bulkInvite(creatorIds: string[], campaignId: string)
  // → { jobId, affected: number }
```

---

## Acceptance checks

1. Apply three filters at once and confirm they narrow with AND and the count
   updates.
2. Clear filters and confirm the full roster returns.
3. Select several rows and confirm the bulk bar appears with a count, and
   that confirming requires typing.
4. Open a creator with a `refresh_error` set and confirm the error is visible
   rather than a stale number shown as current.
5. In the application queue, waitlist a creator and confirm they remain
   searchable in the directory with a waitlisted status.
6. Reject a creator and confirm a reason is mandatory and an audit entry
   appears.
7. Confirm every follower count and metric uses `tabular`.
8. Confirm no horizontal scroll at 768px.

---

## Open questions for the client

- What is the follower threshold below which waitlist is the default?
- Should a waitlisted creator see that they are waitlisted, or only that a
  decision is pending?
- Who may suspend — any admin or the super admin only?
