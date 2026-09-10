# Admin — Metrics verification

**Track B.** Routes: `/admin/metrics`, `/admin/metrics/[livePostId]`.

Where numbers become trustworthy enough to put in front of a brand.

---

## Why this screen exists

Most student creators hold personal Instagram accounts, which the API cannot
read. So for most of the roster the numbers arrive **typed in by the creator**
with a screenshot attached. Somebody at Puzzle Media has to look at the
screenshot and confirm the numbers, because a brand report built on
unverified self-reported figures is worth nothing.

The rule that shapes the whole screen: **a correction inserts a new snapshot
and retains the original.** There is no in-place edit. If a creator typed
14,820 and the screenshot says 14,280, both rows exist afterwards, the first
marked superseded. That is the audit trail.

---

## 1. Verification queue — `/admin/metrics`

### Grouping

Three sections, in this order:

| Section | Contains |
|---|---|
| **Waiting on you** | Creator-submitted, unverified |
| **Collecting** | Published, inside the 7-day window, nothing to do yet |
| **Verified** | Done, collapsed by default |

The middle section matters: without it an operator cannot tell the difference
between "nobody submitted" and "it is too early to expect anything".

### Row content

Creator name, campaign, brand, publish date, days since publication, source
badge, and how many metric types were submitted. Row opens the detail.

For rows inside the collecting window, show the countdown to the 7-day mark
using the same wording the creator sees, so both sides agree.

### States

- **Loading**: `CardSkeleton rows={4}`.
- **Empty**: "Nothing to verify" with the explanation that results are read
  seven days after a post goes live.
- **Error**: `ErrorState` with retry.

---

## 2. Verification detail — `/admin/metrics/[livePostId]`

### Layout

Two columns above 1024px. Evidence on the left, the numbers on the right, so
an operator compares without scrolling.

**Left — the evidence**
- The live post link, opening in a new tab.
- The creator's insights screenshot at full width, clickable to enlarge.
- Publish timestamp and the platform.
- Who verified the link, and when.

**Right — the numbers**
A row per metric type: label, the submitted value in a numeric input, the
source badge, and when it was captured.

### Actions

**Accept all** — confirms every submitted value as-is. One click for the
common case, because most submissions are honest and the operator is doing
this twenty times.

**Correct** — the operator edits a value. The moment any value differs from
what was submitted, a **reason field appears and becomes required**. Explain
why in the helper text: the original is kept and the correction is recorded,
so the reason is what makes the change defensible later.

**Request a better screenshot** — sends the creator back a task rather than
guessing at an illegible image.

### After verification

Show the resulting snapshot set with `MetricTile`, each carrying its
`source` and `denominator`. A corrected value shows as `admin_verified`; an
accepted one keeps `creator_submitted` but with a verified status.

**Never present manual data as API-verified.** A derived rate is only as
trustworthy as its weakest input, so engagement rate computed from
creator-submitted reach is labelled creator-submitted.

---

## Endpoints

Available now:

```ts
api.metrics.verify(id, { value?: number; reason?: string })
  // Same value → marks verified.
  // Different value → requires reason, inserts a new snapshot,
  //                   sets superseded_by on the original.
```

Needed:

```ts
api.admin.metrics.queue()
  // → { items: Array<{ livePost, campaign, brand, creator,
  //       snapshots, daysSincePublish, windowClosesAt }> }

api.admin.metrics.get(livePostId)
  // → { livePost, campaign, brand, creator, snapshots, history }

api.admin.metrics.acceptAll(livePostId)   // → MetricSnapshot[]
api.admin.metrics.requestBetterEvidence(livePostId, message)
```

---

## Acceptance checks

1. Open a submission and change one value. Confirm the reason field appears
   and Confirm stays disabled until it is filled.
2. Save the correction. Confirm a new snapshot exists, the original is still
   present marked superseded, and an audit entry appears.
3. Accept a submission unchanged and confirm no new snapshot is created and
   the status becomes verified.
4. Confirm every tile shows a source label and a denominator.
5. Confirm a rate derived from creator-submitted inputs is not labelled
   auto-synced.
6. Confirm a post inside the 7-day window appears under Collecting with a
   countdown, not under Waiting on you.
7. Confirm no horizontal scroll at 768px.

---

## Open questions for the client

- If a creator never submits numbers, what is the escalation? A reminder, a
  chase task, or does Puzzle Media enter them?
- Does a corrected value need the creator to be notified?
