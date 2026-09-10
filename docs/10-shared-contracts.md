# Shared contracts

Owned by Track A. Track B builds against this and does not edit the files it
describes. To request a change, add an entry to `40-shared-requests.md`.

---

## 1. Design tokens

Defined in `src/app/globals.css` as three stacked layers: raw palette →
semantic mapping → Tailwind binding. Use the Tailwind class, never a hex.

### Surfaces and text

| Class | Use |
|---|---|
| `bg-background` | Page ground |
| `bg-surface` | Cards, bars, anything sitting on the ground |
| `bg-surface-sunken` | Recessed areas, table headers, admin page ground |
| `bg-card` / `text-card-foreground` | shadcn card contract |
| `text-foreground` | Body text |
| `text-muted-foreground` | Secondary text, labels, timestamps |
| `border-border` | Every divider and outline |

### Brand and energy

| Class | Use |
|---|---|
| `bg-primary` / `text-primary` / `text-primary-foreground` | Primary actions, active nav |
| `text-energy` / `bg-energy-bg` / `border-energy-border` | **Reserved for "this needs you now".** The action-required card and pending states. Spending it elsewhere is what makes a dashboard unreadable. |
| `ring` / `focus-visible:outline` | Focus. Never `outline: none`. |

### Status — five tones, one vocabulary

Every status pill in every domain resolves through `src/lib/domain/status.ts`.
Do not invent a sixth tone or map a status to a colour inline.

| Tone | Classes | Means |
|---|---|---|
| `neutral` | `bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border` | Not started, locked, withdrawn |
| `info` | `bg-status-info-*` | Submitted, under review, in production |
| `warn` | `bg-status-warn-*` | Changes requested, pending, invited |
| `success` | `bg-status-success-*` | Approved, verified, paid |
| `danger` | `bg-status-danger-*` | Rejected, removed, overdue |

**Status is never colour alone.** Every pill carries an icon plus text
(WCAG 1.4.1), which `StatusPill` handles for you.

### Type

| Class | Use |
|---|---|
| `font-display` | Headings. Bricolage Grotesque. |
| `font-sans` | Body. Familjen Grotesk. The default. |
| `font-mono` | **Only** countdowns, version numbers, ids, and amounts in tables. Martian Mono. |
| `text-display` `text-h1` `text-h2` `text-body` `text-sm` `text-caption` | The scale. Body is 15px. |
| `tabular` | **Mandatory** on every currency amount, count and metric. Without it column widths shift per row and the ledger looks broken. |

Nothing goes below 12px. Inputs stay at 16px on mobile to stop iOS zooming.

### Spacing, radius, shadow

4px base. `rounded-md` (10px) for cards, `rounded-lg` (14px) for panels,
`rounded-full` for pills. Radii stop at 20px — oversized radii are a chief
signifier of generic AI output. Shadows are warm-tinted (`shadow-sm/md/lg`)
and in dark mode become border-lightening automatically.

---

## 2. Shared components

All of these are pure: props in, callbacks out. Import from
`@/components/patterns` or `@/components/domain`.

### Patterns

| Component | Props | Notes |
|---|---|---|
| `StatusPill` | `status: StatusDescriptor`, `size?: "sm" \| "md"` | Get the descriptor from `deliverableStatus()`, `participationStatus()`, `paymentStatus()` or `scanStatus()` in `lib/domain/status`. |
| `SlaCountdown` | `view: SlaView`, `live?`, `showLabel?` | Build the view with `slaView(clock)`. Mono and tabular so a ticking value does not jitter. |
| `OwnershipBadge` | `owner: OwnerKind`, `since: string` | Answers "who is blocking this, since when". |
| `EmptyState` | `title`, `description?`, `icon?`, `action?` | |
| `ErrorState` | `message`, `title?`, `isOffline?`, `onRetry?` | Feed it `messageFor(error)`. |
| `CardSkeleton` | `rows?: number` | The loading state. |
| `SectionHeader` | `title`, `description?`, `action?` | Within a page. |
| `PageHeader` | `title`, `description?`, `action?` | Top of a page. |
| `Stepper` / `StepperRail` | `steps`, `currentIndex`, `completedIndices` | Mobile dots / desktop rail. |
| `UploadProgress` | `snapshot`, `onPause`, `onResume`, `onRetry`, `onCancel` | Pure; the session lives in `useUpload()`. |

### Domain

| Component | Notes |
|---|---|
| `ActionRequiredCard` | The one urgent task, above the fold. Amber. |
| `TaskCard` | Urgency-tinted left rule. |
| `DraftCounter` | `budget: DraftBudget` from `draftBudget()`. Shows "2 of 3 drafts". |
| `GatingNotice` | Why something is locked and what unlocks it. |
| `SubmissionVersionTimeline` | Full version history with decisions and feedback. |
| `MetricTile` | **`denominator` and `source` are required props.** An unlabelled rate is a compile error, and a rate derived from creator-submitted numbers must never be labelled auto-synced. |

### shadcn primitives

23 components vendored in `src/components/ui/`. Button, Card, Badge, Input,
Label, Textarea, Select, Checkbox, RadioGroup, Dialog, Sheet, Drawer, Tabs,
Progress, Separator, Skeleton, Avatar, Accordion, Tooltip, Alert,
DropdownMenu, Popover, Sonner. Add more with
`npx shadcn@latest add <name>` — this is the one shared directory Track B may
extend, since vendoring a primitive does not change existing behaviour.

---

## 3. API surface

Import `api` from `@/lib/api/client`. Never call `transport` or the mock
handlers directly.

```ts
import { api } from "@/lib/api/client";
import { useQuery, useMutation } from "@/lib/api/hooks";
```

### Hooks

```ts
const { data, isLoading, isRefetching, error, refetch } =
  useQuery((signal) => api.admin.creators({ signal }), []);

const action = useMutation(
  (input: Input, idempotencyKey: string) =>
    api.livePosts.verify(input.id, { idempotencyKey }),
  { onSuccess: () => toast.success("…"), onError: (e) => toast.error(messageFor(e)) },
);
```

`useQuery` re-runs whenever the mock store mutates, so a change made on one
screen updates every other screen with no invalidation call. Shapes are
deliberately React-Query-shaped so it can be adopted later without touching
containers.

`useMutation` generates one idempotency key per attempt and holds it across
retries, so a double-tap cannot create two records.

### Admin endpoints available now

```ts
api.admin.overview()      // counts for the overview tiles
api.admin.creators()      // { items: [{ profile, user, socialAccounts, assignments }] }
api.admin.slaQueue()      // { items: [{ clock, deliverable, campaign, creator }] }
api.admin.livePosts()     // { items: [{ livePost, campaign, creator }] }
api.admin.earnings()      // { items: [{ earning, assignment, campaign, brand, creator }] }
api.admin.audit()         // { items: AuditLog[] }

api.reviewer.queue()      // { items: ReviewQueueItem[], stage: ReviewStage }
api.reviewer.submission(id)
api.submissions.review(id, { stage, decision, feedback, reasonCode?, internalNote?, endsParticipation? })

api.livePosts.verify(id)
api.metrics.verify(id, { value?, reason? })
api.deliverables.grantRound(id, reason)
```

Anything else Track B needs goes in `40-shared-requests.md`.

### Errors

Everything throws a normalized `ApiError` with
`kind: "network" | "validation" | "conflict" | "not_found" | "forbidden" | "rate_limit" | "server"`.
Render with `<ErrorState message={messageFor(error)} onRetry={refetch} />`.
Field errors from a 422 arrive as `mutation.fieldErrors`.

**Out-of-scope reads return 404, never 403.** A 403 confirms the record
exists, which leaks the existence of other brands' campaigns to a
competitor's reviewer.

### Failure scenarios

The dev-tools panel forces network failure, slow connection, validation
failure, conflict, upload interruption and infected files. Use it to build
the error states rather than discovering them at a demo.

---

## 4. Domain rules

In `src/lib/domain/`. Pure functions, unit tested, re-checked in the mock
handlers. **Call these; do not re-implement them.**

```ts
// deliverables.ts
evaluateGate(deliverable, blocker)      // → { blocked, reason }
draftBudget(deliverable, versions)      // → { used, limit, remaining, exhausted, extended }
canSubmit(deliverable, versions, blocker)
statusAfterChangesRequested(...)        // exhausting the cap rejects
ownerForStatus(status)                  // who owes the next action

// review.ts
reviewChain(campaign)                   // ["puzzle_media", "brand"]
currentStage(campaign, reviews)         // which stage holds it, or null
isVisibleToStage(campaign, reviews, stage)
validateDecision(input)                 // min 10 chars feedback; reason code on reject
applyDecision(campaign, deliverable, versions, priorReviews, input)

// tasks.ts
sortByUrgency(tasks)                    // overdue → due soon → later
topActionRequired(tasks)                // what the dashboard card renders

// sla.ts
slaView(clock)                          // → { state, remainingText, isOverdue, approachingBreach }
slaSortKey(clock)                       // queue sort: least time first

// status.ts
deliverableStatus/participationStatus/paymentStatus/scanStatus(s) → StatusDescriptor
```

### The rules these encode

- **Video gating.** Video is blocked until the linked script is approved. When
  blocked, render **no upload control at all** — not a disabled one.
- **Three drafts per deliverable**, counted separately for script and video,
  including the first. Exhausting them rejects the deliverable; a super admin
  can grant another round.
- **Two-stage review.** Puzzle Media reviews first from the admin console,
  then the brand from the reviewer desk. The brand's SLA clock starts only on
  release.
- **Reject** carries the reviewer's explicit choice of whether it also ends
  the creator's participation.
- **Expired ≠ Declined.** A creator who never saw an invitation has not
  refused it, and conflating them corrupts any future reliability metric.

---

## 5. Formatting

```ts
import { formatMoney, formatCompact, formatNumber } from "@/lib/format/currency";
import { formatDate, formatDateTime, formatFull, formatRelative,
         formatRelativeDeadline } from "@/lib/format/datetime";
import { EARNINGS, METRIC_SOURCE_LABEL, REVIEW_STAGE_LABEL } from "@/lib/format/copy";
```

Amounts are integer **paise**; `formatMoney(750000)` → `₹7,500`. All
timestamps are UTC ISO strings, displayed in Asia/Kolkata.

Pair every amount with the `tabular` class.

---

## 6. Conventions

**Route files stay thin.** A page imports one screen component and renders it.

```tsx
// src/app/(admin)/admin/creators/page.tsx
import type { Metadata } from "next";
import { AdminCreatorsScreen } from "@/features/admin/creators-screen";

export const metadata: Metadata = { title: "Creators" };

export default function Page() {
  return <AdminCreatorsScreen />;
}
```

Dynamic routes await their params and use the generated `PageProps` type:

```tsx
export default async function Page({ params }: PageProps<"/admin/creators/[id]">) {
  const { id } = await params;
  return <AdminCreatorDetailScreen creatorId={id} />;
}
```

Run `npx next typegen` after adding a route, or the type will not exist yet.

**Copy is plain.** Short sentences. Say what happened and what to do. No
exclamation marks, no "Oops", no jargon a nineteen-year-old would have to
look up. Prefer "Puzzle Media is reviewing this" over "Pending PM approval".

**Comments explain why, not what.** A comment that restates the code is
noise; one that records a constraint or a rejected alternative is worth
keeping.
