# Start here

Front-end build for the Puzzle Media Campus Influencer Platform, split across
two agents working in the same repository.

**Read this file first, then the one document for your track.** Everything in
`docs/` is subject to change as client requirements land; when a spec and the
code disagree, the spec is the intent and the code is the current state — say
which one you are changing.

## The split

| Track | Owner | Scope |
|---|---|---|
| **A — Creator portal** | Claude | `src/app/(creator)`, `src/app/(onboarding)`, `src/app/(auth)`, matching `src/features/*`. Plus **all shared code**. |
| **B — Puzzle Media admin** | Codex | `src/app/(admin)`, `src/features/admin/*`. Consumes shared code without editing it. |

The brand-side reviewer desk (`src/app/(reviewer)`) is shared surface. Track A
owns it, because it renders the same components the admin console uses.

### Why shared code has one owner

Track A owns design tokens, the mock API, domain rules and shared components.
Two agents editing a token file or a component's props in parallel produces
merge conflicts that are tedious rather than interesting, and worse, produces
two near-identical components that drift.

**Track B does not edit shared code.** If Track B needs a new endpoint, a new
shared component, or a change to an existing one, it writes the request into
`docs/40-shared-requests.md` and builds against the documented contract in the
meantime. Track A picks these up and implements them.

Shared, owned by Track A:

```
src/app/globals.css        design tokens — the whole re-skin surface
src/lib/api/**             client, transport, mock handlers, seed
src/lib/domain/**          business rules (gating, draft cap, review chain)
src/lib/types/**           entities
src/lib/format/**          dates, currency, fixed copy
src/components/**          all presentational components
src/features/shell/**      portal shells, dev bar
src/features/reviewer/**   shared review queue + review screen
```

Track B owns exclusively:

```
src/app/(admin)/**
src/features/admin/**
```

## Ground rules for both tracks

**1. The architecture boundary is enforced by lint, not by convention.**
Nothing under `src/components/` may import from `src/lib/api/` or
`src/features/` except as a type-only import. Components take data as props
and emit intent as callbacks. Data fetching happens in feature containers.

**2. Never hardcode a colour.** Use semantic tokens (`bg-surface`,
`text-muted-foreground`, `border-status-warn-border`). Dark mode is re-picked
rather than inverted, so a hex value is not merely untidy — it is a colour
that cannot adapt. Lint blocks `bg-[#...]` and raw hex in components.

**3. Business rules live in `src/lib/domain/` and are re-checked in the mock
handlers.** Do not re-implement a rule in a component. If the gate, the draft
cap or the review chain needs to change, it changes in one place.

**4. Every screen needs four states**: loading (skeleton), empty, error, and
loaded. The mock adds jittered latency specifically so these get built rather
than discovered at demo time.

**5. Verify by driving a real browser, not by reading the code.** Every spec
ends with acceptance checks. Run them.

**6. Run `npm run verify` before you commit.** It runs types, lint, the
compliance greps and the tests together.

## Hard product boundaries

These are compliance boundaries, not preferences. `npm run compliance` greps
product code for them.

- **No money moves in this platform.** Earnings is a read-only ledger plus a
  CSV export a human acts on. If a ticket implies a state change to money, it
  is Phase 2.
- **No identity documents or payment instruments exist** in the Phase 1 schema
  or UI: no college ID, Aadhaar, PAN, UPI or bank field.
- **The three earnings strings are fixed**: "Total Earnings", "Pending
  Payment", "Paid Earnings", imported from `lib/format/copy.ts`. The phrase
  "money generated" must never appear.
- **Every displayed metric shows its source and its denominator.** This is
  enforced by required props on `MetricTile`, so an unlabelled rate is a
  compile error.
- **Approvals are human.** The platform routes, times and records approvals.
  It never grants one.

## The documents

| File | For | What it is |
|---|---|---|
| `00-START-HERE.md` | Both | This file |
| `10-shared-contracts.md` | Both | Tokens, components, API surface, domain rules |
| `20-track-a-creator.md` | Claude | Creator portal plan, ordered |
| `30-track-b-admin.md` | Codex | Admin console plan, ordered |
| `40-shared-requests.md` | Both | Track B's requests to Track A |
| `screens/*.md` | Both | One spec per screen |

## Current state

The creator portal, the brand reviewer desk and a partial admin console are
built and working against the mock. Run `npm run dev` and use the floating
developer-tools button to switch roles.

Track A's job is to finish and harden the creator portal. Track B's job is to
build the admin console out from partial to complete.
