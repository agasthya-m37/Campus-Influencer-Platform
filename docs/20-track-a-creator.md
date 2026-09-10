# Track A — Creator portal and shared foundations

**Owner: Claude.** Read `00-START-HERE.md` and `10-shared-contracts.md` first.

Two jobs: finish and harden the creator portal, and keep shared code moving so
Track B is never blocked waiting on an endpoint or a component.

## Who uses this and how

A nineteen-year-old on a mid-range Android, on campus, on patchy 4G, between
lectures. They opened the app because a notification said something needs
them. They have ninety seconds.

Design implications:

- **360px is the design width, not a breakpoint to check later.** If it only
  works on a laptop it is not done.
- **The most urgent thing is the first thing.** Everything else is below it.
- **Never lose typed work.** Auto-save is debounced, not blur-based: on
  Android, dismissing the keyboard does not reliably fire blur before the page
  is backgrounded.
- **Explain the wait.** A screen that says "results in 3 days" beats an empty
  screen that looks broken.

## What already exists

| Route | State |
|---|---|
| `/login` | Working — OTP with paste support and SMS autofill |
| `/onboarding/[step]` | Working — 8 steps, debounced auto-save, resume |
| `/home` | Working — all 8 dashboard sections |
| `/campaigns` + `/[id]` | Working — accept, decline, withdraw |
| `/tasks` | Working — urgency-sorted queue |
| `/deliverables/[id]` | Working — status, SLA, ownership, history |
| `/deliverables/[id]/submit` | Working — script and video, resumable upload |
| `/deliverables/[id]/go-live` | Working — instructions, link, publish time |
| `/performance` | Working — 7-day countdown, provenance, denominators |
| `/earnings` | Working — fixed strings, eligibility gates |
| `/learn` | Working — events and RSVP |
| `/notifications` | Working — deep links, read state |
| `/profile` | Working — completeness, accounts, consent records |

## Build order

### A1 — Metrics submission by the creator
`docs/screens/creator-metrics-submit.md`

The largest functional gap. Most students hold personal Instagram accounts,
which the API cannot read, so creator-submitted numbers are the primary path
for most of the roster — not a fallback. Form for reach, impressions, views
and engagements, plus an insights screenshot, with a clear "awaiting review by
Puzzle Media" state afterwards.

Endpoint exists: `api.livePosts.submitMetrics(id, metrics, window)`.

### A2 — Campaign brief versioning
`docs/screens/creator-campaign-detail.md` §Brief changes

Editing a live brief is the highest-risk admin action in the product: a
creator may already be working to v1. The creator must see that the brief
changed and when. Without it Puzzle Media has no defence in a dispute about
what was asked for.

Needs a new endpoint and a `brief_changed` notification type.

### A3 — Notification preferences
`docs/screens/creator-profile.md` §Preferences

Creators can mute non-critical categories. Task and approval notifications
cannot be muted — those are the product working.

### A4 — PWA and offline shell
`docs/screens/creator-pwa.md`

Manifest, icons, and a hand-written service worker of roughly sixty lines:
precache the shell and fonts, network-first navigation with an offline
fallback, cache-first static assets, and **explicitly no caching or queueing
of mutations**. Hand-written rather than a Workbox plugin because the
no-offline-writes rule must be auditable at a glance and background sync must
not sneak in through defaults.

An unsent submission is a worse failure than a blocked one.

### A5 — Harden what exists

- **Reject and rejection recovery.** A creator whose deliverable was rejected
  currently sees a terse message. They need to know whether they are still on
  the campaign and what happens next.
- **Withdrawn and removed states** across campaign detail and tasks.
- **Quarantined file state** — the upload scan failed, the clock did not
  start, and the creator has to replace the file.
- **Empty and error states** on every screen, checked with the dev panel's
  network-failure toggle.
- **Deep-link cold start**: every notification must resolve to its record
  after a fresh load and re-authentication.

### A6 — Accessibility and performance pass

- Screen-reader pass on the submission form and the dashboard.
- `prefers-reduced-motion` verified end to end.
- Bundle check on `/home`; flag anything over ~150 KB gzipped.
- Re-run the 360px sweep, the two-tap measurement and the contrast audit.

## Shared-code duties

Track A also implements everything in `40-shared-requests.md`. Treat those as
interrupts with priority over A5 and A6 — a blocked Track B is more expensive
than a slightly rougher creator screen.

Known upcoming shared work, from Track B's specs:

| Needed for | Endpoint |
|---|---|
| Campaign builder | `api.admin.campaigns.list/get/create/update/publish` |
| Eligibility preview | `api.admin.campaigns.previewEligibility(rules)` → matching creator count |
| Creator review queue | `api.admin.creators.decide(id, decision, reason)` |
| Events | `api.admin.events.create/update`, `api.admin.rsvps.list` |
| Announcements | `api.admin.announcements.create/send`, delivery and read counts |
| Brief versioning | `api.campaigns.publishBrief(id, content)` |

Add each to `src/lib/api/client.ts`, implement the handler in
`src/lib/api/mock/handlers.ts`, extend the seed if the screen needs data to
render, and tell Track B in `40-shared-requests.md` when it lands.

## Working agreement

- Commit per screen. A commit leaves the app working.
- `npm run verify` before every commit.
- Verify at 360×640 in a real browser, not by reading the code.
- Update the matching spec in `docs/screens/` in the same commit as the code.
