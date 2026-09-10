# Puzzle Media Campus Influencer Platform — front end

The system of record for the creator–campaign relationship. Phase 1 replaces
WhatsApp threads and spreadsheets: onboard a creator, assign a campaign, run
two-stage content approval, verify a live post, capture results, show the
creator their earnings. **No money moves in this platform.**

```bash
npm install
npm run dev        # http://localhost:3000
```

There is no backend. The app runs against an in-memory mock seeded with one
creator across every workflow state, so every screen has something real to
show. Use the floating **developer tools** button (bottom right, dev only) to
switch between creator, brand reviewer and Puzzle Media super admin, to force
failure scenarios, or to reset the demo data.

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the architecture boundary rule |
| `npm test` | Vitest over the domain rules |
| `npm run compliance` | Greps product code for prohibited terms |
| `npm run verify` | All four, in order |

## How this is put together

Three portals live in one app as route groups, because each needs its own
`viewport` and metadata: `(creator)` is a mobile-first PWA surface,
`(reviewer)` and `(admin)` are desktop data tools.

**Puzzle Media has no separate reviewer portal.** Its content review lives in
the admin console under *Content review*, so one person moves between
approving a script and verifying a live link without switching apps. The
reviewer desk is brand-side only. Both use the same queue and review
components; the API decides the review stage from the signed-in user's role.

```
src/
├── app/                 routes only; each group owns its chrome
├── components/          PRESENTATIONAL. Props in, callbacks out.
│   ├── ui/              vendored shadcn primitives
│   ├── patterns/        cross-portal: status pill, SLA countdown, stepper…
│   ├── domain/          domain-shaped but still pure: task card, metric tile…
│   └── chrome/          pure chrome: bottom nav, theme provider
├── features/            THE ONLY DATA-BOUND LAYER. Containers + mappers.
│   └── shell/           shells and dev bar — they fetch, so they live here
├── lib/
│   ├── api/             client.ts → transport.ts → mock/
│   ├── domain/          pure business rules, unit tested
│   ├── types/           PRD §6 entities
│   └── format/          dates (IST), currency (INR), fixed copy
└── hooks/
```

### Three seams, because the client's front end arrives later

**1. Presentational ÷ data-bound.** Nothing under `components/` may import
from `lib/api/` or `features/`. This is enforced by an ESLint rule, not by
discipline — without it the boundary erodes in a fortnight. If their
components are better we swap `components/`; if their data layer is better we
swap `features/`.

**2. View models.** Containers map entities to view models before rendering,
so a schema rename touches one mapper and zero components.

**3. Token layer.** `globals.css` stacks three layers: raw palette, semantic
mapping, Tailwind binding. Components reference only semantic tokens, and an
ESLint rule bans hex values inside them. Re-skinning is editing one file.

### Swapping in a real backend

`lib/api/client.ts` mirrors the API surface one-to-one and contains no mock
logic. It builds request descriptors addressed by the same path strings the
real API will use (`POST /deliverables/:id/submissions`) and hands them to
`lib/api/transport.ts`. That file is the whole migration:

```ts
export const transport: Transport = mockTransport;   // → httpTransport
```

`httpTransport` is already written, roughly thirty lines of `fetch`.

Hook return shapes are deliberately React-Query-shaped (`{ data, isLoading,
error }`, `{ mutate, isPending }`) even though React Query is not used. The
mock store already *is* a normalized client cache, and a second cache would
need invalidation to stay honest. When a real backend lands, adopting React
Query is a change inside `lib/api/hooks.ts` and nowhere else.

## Rules that live in code, not in a document

These are in `lib/domain/` as pure functions, re-checked server-side in the
mock handlers, and covered by tests — the UI cannot permit what they forbid.

- **Video gating.** Video submission is blocked until the linked script is
  approved. When blocked, no upload control exists in the DOM at all.
- **Three drafts per deliverable**, counted separately for script and video,
  including the first. Exhausting them rejects the deliverable; a super admin
  can grant another round.
- **Two-stage review.** Puzzle Media reviews first from the admin console,
  then the brand from the reviewer desk. The brand's SLA clock starts only on
  release, and a brand reviewer requesting a submission they cannot see gets
  a 404, never a 403 — a 403 would confirm the record exists and leak other
  brands' campaigns.
- **Reject** carries the reviewer's explicit choice of whether it also ends
  the creator's participation on the campaign.
- **Participation is three state machines** on one discriminator. `Expired`
  and `Declined` stay distinct: a creator who never saw an invitation has not
  refused it.
- **Tasks are a first-class object.** The dashboard's action-required card
  calls the same `topActionRequired()` the task queue uses, so the two cannot
  disagree.

Two product rules are enforced by the type system rather than by review:
`MetricTile` makes `denominator` and `source` required props, so an
unlabelled rate or an unattributed number is a compile error. The three
earnings strings live in `lib/format/copy.ts`.

**No identity documents exist in the Phase 1 schema or UI** — no college ID,
Aadhaar, PAN, UPI or bank field. `npm run compliance` greps product code for
these and for the forbidden earnings phrasing, ignoring comments and tests so
the rules can still be documented where they apply.

## What is verified, and how

Checked by driving a real headless browser, not by inspection:

| Requirement | Result |
|---|---|
| No horizontal scroll at 360px | 17 routes, zero overflow, zero console errors |
| Two-tap rule | Every open task reachable in 1 tap |
| Video gating | Gated deliverable renders 0 file inputs, 0 submit links |
| Two-stage isolation | Brand sees nothing before release, by queue or direct URL; admin approves and it appears |
| Upload resilience | Pause freezes, resume continues from the same byte, interruption at 42% retries to completion |
| Auto-save and resume | Debounce holds 800ms, values survive a reload |
| WCAG AA contrast | 5 routes × both themes, zero failures, measured from rendered pixels |
| Keyboard | Every control has a focus ring, every input labelled, no target under 44px |
| Performance on 4G | First paint 284ms, largest paint 620ms against a 3s budget |

Auto-save is debounced, **not** blur-based: on Android, dismissing the
keyboard does not reliably fire blur before the page is backgrounded, so a
blur-triggered save loses the field just typed.

## Not built yet

Announcements composer, taxonomy management, bulk CSV import, creator
replacement, brand onboarding screens, the PWA service worker and offline
shell, and admin metric verification. Fee and deadline change handling is
deliberately out of scope pending client confirmation; the data model records
the prior value, actor and timestamp regardless.
