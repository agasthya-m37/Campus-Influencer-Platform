# Admin — Overview

**Track B.** Route: `/admin/overview`.

The screen someone opens first thing in the morning.

---

## Why this screen exists

It answers one question: **what needs a person today?** Everything else on it
is secondary. A count tile that does not link to the exact filtered list it
describes is decoration.

The current version renders five count tiles. That is the right skeleton and
the wrong depth — a count tells you a job exists but not whether it is on
fire.

---

## Layout

### 1. Needs attention

The existing tiles, each linking to its filtered list:

| Tile | Links to |
|---|---|
| Submissions awaiting review | `/admin/review` |
| Live links to verify | `/admin/live-posts` |
| SLA breaches open | `/admin/sla` |
| Profiles to review | `/admin/creators/applications` |
| Results outstanding | `/admin/metrics` |

**Add urgency to each tile.** A count of 4 where one is overdue reads very
differently from 4 where none are. Show a second line: "2 overdue" in
`text-status-danger-fg`, or "all within SLA" in muted text. A tile with
nothing outstanding drops to muted styling rather than shouting zero.

### 2. Campaigns at risk

New section. A campaign is at risk when any of these hold:

- A deliverable is overdue with the creator.
- A review SLA is breached.
- Go-live is within 48 hours and the video is not approved.
- A creator withdrew and has not been replaced.

Each row: campaign, brand, what is wrong in a short phrase, and a link
straight to the thing that fixes it. This is the section that earns the
screen — it surfaces problems nobody has thought to look for yet.

### 3. Today

A dated list of what is due today across all campaigns: deliverables due,
go-lives scheduled, events starting, metrics windows closing.

### 4. The network

Existing counts — creators, campaigns, brands. Keep them, but move them to
the bottom. They are context, not work.

---

## States

- **Loading**: skeleton tiles that match the final layout, so the page does
  not reflow when data lands.
- **Everything clear**: do not show an empty state for the whole page. Show
  the tiles at zero in muted styling, and an `EmptyState` inside the at-risk
  section saying nothing needs attention. The distinction matters: a blank
  page reads as broken, a quiet page reads as calm.
- **Error**: `ErrorState` with retry.

---

## Endpoints

`api.admin.overview()` exists and returns flat counts. Extend it:

```ts
api.admin.overview()
  // → {
  //   attention: {
  //     pendingReview:    { count, overdue },
  //     unverifiedLinks:  { count, overdue },
  //     openBreaches:     { count },
  //     pendingProfiles:  { count, oldestWaitingDays },
  //     metricsOutstanding: { count, overdue },
  //   },
  //   atRisk: Array<{ campaign, brand, reason, href }>,
  //   today: Array<{ kind, label, href, at }>,
  //   network: { creators, campaigns, brands },
  // }
```

---

## Acceptance checks

1. Every tile navigates to a list already filtered to what the tile counted.
   A tile reading 4 must land on a list showing those 4.
2. Force an overdue item and confirm the tile's second line reports it in the
   danger tone.
3. With nothing outstanding, confirm tiles read as muted zeros and the page
   does not look broken.
4. Confirm a campaign with a breached SLA appears in Campaigns at risk with a
   link that resolves to the breach.
5. Turn on network failure and confirm one `ErrorState` for the page rather
   than five broken tiles.
6. Confirm every count uses `tabular`.
7. Confirm no horizontal scroll at 768px.
