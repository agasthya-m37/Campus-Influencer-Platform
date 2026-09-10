# Track B — Puzzle Media admin console

**Owner: Codex.** Read `00-START-HERE.md` and `10-shared-contracts.md` first.

You are building the operations console Puzzle Media's team lives in all day.
Everything the agency does that is not creating content happens here:
reviewing submissions, running campaigns, managing the roster, verifying live
posts, checking numbers, and producing the finance file.

## Who uses this and how

One or two people at a small agency, on a laptop, with twenty browser tabs
open. They are not power users of your software; they are power users of
*campaign operations*. The console succeeds when it answers "what needs me
today" in one screen and lets them clear it without hunting.

Design implications you should hold onto:

- **Density is a feature here**, unlike the creator portal. Tables beat cards.
  Show more rows, not bigger ones.
- **Every list needs a count** so they can see the size of the job.
- **Destructive and irreversible actions need a reason field**, because the
  audit log is the product's defence in a dispute with a brand or a creator.
- **Never make them switch apps to answer a question.** If a row raises "who
  is this creator", the answer belongs one click away, not in another portal.

## What already exists

Built and working — read these before writing anything, they set the pattern:

| Route | File | State |
|---|---|---|
| `/admin/overview` | `features/admin/admin-screens.tsx` | Working, needs extending |
| `/admin/review` + `/[id]` | Reuses `features/reviewer/*` | Working, do not modify the shared screens |
| `/admin/creators` | `admin-screens.tsx` | Table only, no detail view |
| `/admin/sla` | `admin-screens.tsx` | Working |
| `/admin/live-posts` | `admin-screens.tsx` | Working, verification functional |
| `/admin/earnings` | `admin-screens.tsx` | Working, CSV export functional |
| `/admin/audit` | `admin-screens.tsx` | Working, read-only list |
| `/admin/campaigns` | placeholder | **Build this** |
| `/admin/metrics` | placeholder | **Build this** |
| `/admin/events` | placeholder | **Build this** |
| `/admin/announcements` | placeholder | **Build this** |

`admin-screens.tsx` is currently one file holding several screens. **Split it
as you go**: one screen per file under `src/features/admin/`, named for the
route (`creators-screen.tsx`, `campaigns-screen.tsx`). Move a screen when you
touch it rather than in one big refactor.

## Build order

Ordered by what unblocks the most and what Puzzle Media needs soonest. Each
step has a spec in `docs/screens/`.

### B1 — Campaign builder (largest, most valuable)
`docs/screens/admin-campaigns.md`

The console's centre of gravity. Without it, campaigns can only be seeded.
List, detail, create and edit; eligibility rules with a live matching count;
deliverables; commercials; deadlines; the brief; and publishing.

Needs new endpoints — see the spec, and request them in
`40-shared-requests.md` before you start.

### B2 — Creator directory detail and review queue
`docs/screens/admin-creators.md`

The list exists; the detail view does not. Also the application review queue:
approve, request information, waitlist, reject, suspend. Waitlist is the
default for creators below threshold; hard reject is for spam only.

### B3 — Metrics verification
`docs/screens/admin-metrics.md`

Creators submit numbers, an admin confirms or corrects them. A correction
inserts a new snapshot and retains the original — never an in-place edit.

### B4 — Events and workshops
`docs/screens/admin-events.md`

Create an event with a speaker profile, target it, watch RSVPs and the
waitlist, check people in, publish resources afterwards.

### B5 — Announcements
`docs/screens/admin-announcements.md`

Compose, target by segment, schedule or send, then see delivery and read
counts.

### B6 — Overview, deepened
`docs/screens/admin-overview.md`

Turn the count tiles into a working queue: what is overdue, what is at risk,
what is waiting on Puzzle Media, each linking to the exact filtered list.

### B7 — Audit log, searchable
`docs/screens/admin-audit.md`

Filter by actor, entity, action and date range. Export is itself audited.

## Rules specific to this console

**1. Puzzle Media reviews content here, not in a separate portal.**
`/admin/review` renders the shared queue and review screens with
`basePath="/admin/review"`. Do not fork them.

**2. Overrides are separate permissions and each writes an audit entry with a
mandatory reason.** Approval override, workflow-status override and
finance-status override are three distinct grants. Where you build one, the
reason field is required and the audit entry is not optional.

**3. Bulk actions need typed confirmation, a cap per invocation, a background
job with a result report, and one audit entry per affected record.** A bulk
action that silently half-succeeds is worse than one that refuses.

**4. Commercial visibility is independent of content access.** A brand
reviewer with full campaign access still receives redacted fees. When you
build a screen showing a fee, check `campaign.reveal_commercials_to_reviewer`
rather than assuming the viewer may see it.

**5. Finance status is display plus export only.** Setting "Paid" records that
finance settled it off-platform. Nothing in this console moves money.

## Working agreement

- **Do not edit shared code.** If you need something, write it into
  `40-shared-requests.md` with the shape you want and why, then build against
  that shape. Track A implements it. Unblock yourself with a local mock only
  if you must, and flag it in the request.
- **Commit per screen**, not per file. A commit should leave the app working.
- **Run `npm run verify` before every commit.**
- **Verify in a browser.** Each spec lists acceptance checks; run them at
  1280px and at 768px. The admin console is desktop-first but must not break
  on a tablet.
- **When a spec and the client's wishes disagree, the client wins** — update
  the spec in the same commit as the code, so the document stays true.
