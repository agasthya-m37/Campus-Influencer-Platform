# Admin — Campaigns

**Track B.** Routes: `/admin/campaigns`, `/admin/campaigns/new`,
`/admin/campaigns/[id]`, `/admin/campaigns/[id]/edit`.

The console's centre of gravity. Everything else in the product exists to
serve a campaign that was configured here.

---

## Why this screen exists

Today a campaign can only arrive through seeded fixtures. Puzzle Media needs
to configure one end to end: who it is for, what the creator makes, by when,
for how much, under what brief, reviewed by whom.

The consequential detail: **campaigns are drafted before the brand is
onboarded.** Commercials close off-platform first, so a campaign must be fully
configurable — and hold creator assignments — while its brand has no account
at all. `brand_visible_from` gates when the brand can see it, and creator
visibility is controlled separately, so creators can be invited before the
brand can see anything.

---

## 1. Campaign list — `/admin/campaigns`

### Layout

`PageHeader` titled "Campaigns" with a primary **New campaign** button.
Below it a filter row, then a table.

### Filters

Status tabs across the top: **Active**, **Draft**, **Completed**, **All**.
Each shows a count. Default to Active.

A search input filters on campaign name and brand name as you type. No submit
button.

### Table columns

| Column | Content |
|---|---|
| Campaign | Name, with the brand name beneath in `text-muted-foreground` |
| Status | `StatusPill` — draft, published, active, paused, completed, cancelled, archived |
| Creators | `accepted / invited` as a fraction, `tabular` |
| Deliverables | `approved / total`, `tabular` |
| Next deadline | The soonest open deadline, or an em dash |
| Brand access | "Visible" or "Not yet onboarded" |

Whole row links to the detail view.

### States

- **Loading**: `CardSkeleton rows={5}`.
- **Empty (no campaigns at all)**: `EmptyState` titled "No campaigns yet",
  description "Create one to start inviting creators", action = New campaign.
- **Empty (filter matches nothing)**: "No campaigns match that", with a clear
  filters action. Do not offer New campaign here — it answers a different
  question.
- **Error**: `ErrorState` with `onRetry`.

---

## 2. Campaign detail — `/admin/campaigns/[id]`

Read-first. Editing happens on `/edit` or through targeted inline actions.

### Header

Brand name above, campaign name as `h1`, `StatusPill`, and a row of actions
appropriate to the status:

| Status | Actions |
|---|---|
| Draft | Edit, Publish, Delete |
| Published / Active | Edit, Pause, Clone, Close |
| Paused | Edit, Resume, Close |
| Completed / Archived | Clone, View report |

**Publish** opens a confirmation summarising what happens: how many creators
match the eligibility rules, and that invitations will be sent. Publishing is
not reversible into draft, so say so.

### Tabs

**Overview** — objective, description, participation mode, review order,
timezone, go-live window, and the commercials summary. Fees display with
`formatMoney` and `tabular`.

**Creators** — a table of assignments: creator name, participation status
pill, per-deliverable status, fee, accepted date. Row actions: view creator,
remove from campaign (reason required), replace creator.

**Deliverables** — the deliverable definitions with type, quantity,
requirements, due date and SLA. Not per-creator; this is the template.

**Brief** — the current brief version rendered, with a version history list.
Each entry shows version number, who published it and when.

**Progress** — counts of assigned, accepted, submitted, approved, live and
complete. Plus SLA figures: median and p90 turnaround, percentage within SLA,
count breached, current open breaches.

### Creator replacement

When a creator withdraws or is removed after accepting, Puzzle Media chooses:

- **Delay** — hold the campaign date and invite a replacement.
- **Reallocate** — assign the outstanding deliverable to another creator
  already on the campaign.

A replacement's deadlines compute from *their* acceptance, not the campaign's
original dates. They inherit the original fee unless changed, and the change
is audited.

---

## 3. Create and edit — `/admin/campaigns/new`, `/admin/campaigns/[id]/edit`

A stepped form. Use `Stepper` for progress. Save a draft at every step so
nothing is lost; a half-configured campaign is a normal state, not an error.

### Step 1 — Basics

| Field | Type | Validation |
|---|---|---|
| Name | text | Required, min 3 |
| Brand | select | Required. Include brands with no account yet. |
| Objective | text | Required |
| Description | textarea | Required, min 20 |
| Cover image | file | Optional |

Offer **Start from a template** at the top. Creating from a template pre-fills
everything except dates and assignments.

### Step 2 — Eligibility and participation

**Participation mode** as a radio group. Invitation is the default and the
priority mode; open application and direct assignment follow.

**Eligibility rules** build the invitation filter. Rules combine AND across
dimensions, OR within a dimension:

| Dimension | Control |
|---|---|
| Cities | multi-select |
| Colleges | multi-select |
| Categories | multi-select |
| Languages | multi-select |
| Platforms | multi-select |
| Follower range | two numeric inputs |

**A live matching count sits beside the rules**: "142 creators match". It
updates as rules change and is the single most useful thing on this step —
without it, rules are guesswork. Inviting the whole database is the unfiltered
case, so an empty rule set is valid and should read as "All 480 creators".

### Step 3 — Deliverables

Repeatable rows. A campaign may carry several deliverables of the same type.

| Field | Notes |
|---|---|
| Type | script, video, live post |
| Quantity | number |
| Requirements | textarea, shown to the creator on the deliverable screen |
| Due date | date-time, interpreted in the campaign timezone |
| Review SLA | hours; defaults 48 for script, 72 for video |

Script and video are linked automatically: video is gated on the script.
Surface that as read-only text so the operator understands the chain.

### Step 4 — Commercials

| Field | Notes |
|---|---|
| Fee per creator | Rupees; store as paise |
| Barter value | Optional alternative |
| Visible to creator | Toggle, default on |
| Reveal to brand reviewer | Toggle, **default off** |
| Revision limit | Default 3 |

State plainly beneath: no payments are processed in the platform; this is what
finance settles against.

### Step 5 — Deadlines and review

Accept-by, go-live window (from and to), metrics due. Review order is a
select with `puzzle_then_brand` as the only value that ships — **keep it a
setting rather than hardcoding it**, because handing review to brands later
must not be a rebuild.

Reviewer assignment: pick the brand-side reviewer(s) for stage two.

### Step 6 — Brief

The brief content: summary, what to make, must include, must avoid, tone,
hashtags, mentions, resource links. Repeatable rows for the list fields.

### Step 7 — Review and publish

Read-only summary with per-section edit links, the matching creator count, and
the publish action.

---

## Endpoints needed

Not built yet. Request in `40-shared-requests.md`, and build against these
shapes:

```ts
api.admin.campaigns.list(filter?: { status?: CampaignStatus; q?: string })
  // → { items: Array<{ campaign, brand, counts: { invited, accepted,
  //                    deliverablesTotal, deliverablesApproved },
  //                    nextDeadline: string | null }> }

api.admin.campaigns.get(id)
  // → { campaign, brand, brief, briefVersions, deliverables,
  //     assignments: Array<{ assignment, creator, deliverables }>,
  //     progress: { assigned, accepted, submitted, approved, live, complete },
  //     sla: { medianHours, p90Hours, withinSlaPct, breached, openBreaches } }

api.admin.campaigns.create(input)      // → Campaign (status: "draft")
api.admin.campaigns.update(id, input)  // → Campaign
api.admin.campaigns.publish(id)        // → { campaign, invitedCount }
api.admin.campaigns.clone(id)          // → Campaign, config without assignments
api.admin.campaigns.setStatus(id, status, reason?)

api.admin.campaigns.previewEligibility(rules: EligibilityRules)
  // → { matchingCount: number, totalCreators: number }

api.admin.assignments.replace(assignmentId,
  { strategy: "delay" | "reallocate", replacementCreatorId?, reason })
```

---

## Acceptance checks

Run these in a browser at 1280px, then confirm nothing breaks at 768px.

1. Create a campaign through all seven steps and save it as a draft. Reload
   mid-way and confirm the draft is intact.
2. Change an eligibility rule and confirm the matching count updates without
   a page reload.
3. Clear all eligibility rules and confirm the count reads as the whole
   roster rather than zero.
4. Publish a draft and confirm the confirmation states the invite count, the
   status moves to published, and the campaign appears in the Active tab.
5. Open a campaign whose brand has no account and confirm it renders fully,
   with brand access shown as "Not yet onboarded".
6. On the Creators tab, remove a creator and confirm a reason is required and
   an audit entry appears in `/admin/audit`.
7. Turn on the dev panel's network-failure toggle and confirm the list, detail
   and form each show `ErrorState` with a working retry.
8. Confirm every fee uses `formatMoney` and carries the `tabular` class.
9. Confirm no horizontal scroll at 768px:
   `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

---

## Open questions for the client

- Can a published campaign's eligibility rules change, or only its brief?
- What happens to already-sent invitations if the rules narrow after publish?
- Who may delete a draft campaign — any admin, or the super admin only?
