# Creator — Submit your results

**Track A.** Route: `/deliverables/[id]/results` (new).

The largest functional gap in the creator portal.

---

## Why this screen exists

Automated metric collection only works for Business and Creator accounts.
**Most students hold personal accounts**, which return nothing from the API,
and there is no workaround. So creator-submitted numbers are not a fallback
for an edge case — they are the primary path for most of the roster.

The creator opens their own Instagram insights, reads four numbers off it,
types them here, and attaches the screenshot as evidence. An admin confirms.

This has to be quick and hard to get wrong, because it is being done on a
phone by somebody who would rather be doing something else.

---

## Entry points

- A task appears when the 7-day window closes on a verified live post.
- The performance screen offers "Add your results" on any post awaiting them.
- A notification deep-links straight here.

---

## Layout at 360px

### Header

Campaign name in muted text, "Add your results" as `h1`, and the post's
publish date. A thumbnail or link to the live post so they are certain which
post this is about — a creator with three live campaigns needs that.

### Instructions

Three short steps, numbered, above the form:

1. Open your post on Instagram.
2. Tap **View insights** below it.
3. Copy the four numbers into the fields below.

Keep it to that. A creator who needs more help than this needs a human, not
more copy.

### The form

Four numeric fields, each with `inputMode="numeric"` so the number pad opens:

| Field | Label | Helper |
|---|---|---|
| reach | Reach | How many accounts saw it |
| impressions | Impressions | How many times it was shown |
| views | Views | Plays of at least 3 seconds |
| engagements | Engagements | Likes, comments, shares and saves together |

The helper text is doing real work: Instagram's own labels change between app
versions, and a creator guessing which number is "reach" is how bad data
enters the system.

Show a derived engagement rate beneath as soon as reach and engagements are
both filled, labelled with its denominator: "4.8% — engagements ÷ reach".
This catches transposed numbers before submission, since a rate over 100%
is obviously wrong to the person who typed it.

### Screenshot

A single file input accepting images, using the existing upload session so it
survives a dropped connection. Encouraged, not required:

> A screenshot helps Puzzle Media confirm these quickly. Without one they may
> come back to ask.

### Submit

Full-width primary button, sticky above the bottom nav. Disabled until all
four numbers are present.

---

## States

| State | Renders |
|---|---|
| **Loading** | `CardSkeleton rows={3}` |
| **Too early** | The 7-day countdown, and no form. Explain that numbers settle first. |
| **Ready** | The form above |
| **Submitting** | Button reads "Sending…", fields disabled |
| **Submitted, awaiting review** | The submitted numbers read-only, each with a `creator_submitted` source chip, and a line saying Puzzle Media is checking them |
| **Verified** | The final numbers with their verified source chips, and a link to the performance screen |
| **Corrected** | The verified numbers, plus a plain note that Puzzle Media adjusted a figure and why. Do not hide this. |
| **Error** | `ErrorState`; field errors inline from `mutation.fieldErrors` |

The corrected state matters. A creator who sees their number changed without
explanation loses trust in every other number in the app.

---

## Validation

- All four required, non-negative integers.
- Impressions must be at least reach. If not, do not block — warn: "Usually
  impressions are higher than reach. Double-check these two." The creator may
  be right and the platform odd; a hard block on a plausible-but-unusual value
  is worse than a nudge.
- Engagements greater than reach gets the same treatment.

---

## Endpoint

Exists:

```ts
api.livePosts.submitMetrics(
  livePostId,
  { reach, impressions, views, engagements },
  "7d",
) // → MetricSnapshot[]
```

Needs adding: the screenshot as `raw_ref` on the snapshots, and a task that
closes on submission.

---

## Acceptance checks

At 360×640:

1. Open the screen for a post inside the 7-day window and confirm the
   countdown shows and no form renders.
2. Type reach and engagements and confirm the derived rate appears with its
   denominator labelled.
3. Enter impressions below reach and confirm a warning appears but submission
   is still allowed.
4. Submit and confirm the screen moves to awaiting-review with
   `creator_submitted` chips.
5. Verify from the admin console with a correction, return here, and confirm
   the correction is visible with its reason.
6. Confirm the numeric keypad opens on every number field on a mobile
   viewport.
7. Confirm no horizontal scroll and every tap target is at least 44px.
8. Complete the whole form by keyboard only.
