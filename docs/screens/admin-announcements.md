# Admin — Announcements

**Track B.** Routes: `/admin/announcements`, `/admin/announcements/new`.

Targeted messaging to creators, in-app.

---

## Why this screen exists

Puzzle Media currently broadcasts on WhatsApp, where a message to forty
creators is forty messages and nobody knows who read it. This replaces that
with one composer, real targeting, and delivery counts.

**In-app only in Phase 1.** The notification layer has a channel abstraction
so email, SMS and WhatsApp drivers can register later without touching call
sites, but only the in-app driver ships. Do not build a channel picker that
implies otherwise.

---

## 1. List — `/admin/announcements`

Tabs: **Sent**, **Scheduled**, **Drafts**, each with a count.

Row content: title, the segment described in words ("Bengaluru, Tech, 5k+"
rather than a rule blob), audience size, sent or scheduled time, and delivery
figures as `read / delivered` with a percentage.

---

## 2. Composer — `/admin/announcements/new`

### Message

| Field | Notes |
|---|---|
| Type | platform, campaign, event |
| Title | Required, max 80. This is what appears in the creator's inbox row. |
| Body | Required, max 500. Plain text. |
| Deep link | Optional. Where tapping it goes. |

Show a **live preview** of the notification row exactly as a creator sees it
at 360px, beside the form. The title is doing most of the work and a composer
without a preview produces titles that truncate.

### Targeting

The shared eligibility rule builder, with a live count: "Sends to 142
creators". Selecting nothing means everybody, and should read as such rather
than as zero.

Add a campaign-scoped option: send to everyone assigned to a given campaign.

### Send

Three actions: **Save draft**, **Schedule** (date-time picker), **Send now**.

Send now opens a confirmation naming the audience size, because it is not
reversible. The confirmation should state the count in words, not just show a
number: "This goes to 142 creators now."

---

## 3. Delivery detail

After sending, the announcement's row expands to show delivered count, read
count and read rate, and a list of recipients with their read state.

Read state is per-notification and already tracked; surface it rather than
computing something new.

---

## Endpoints

```ts
api.admin.announcements.list()
  // → { items: Array<{ announcement, audienceSize, delivered, read }> }
api.admin.announcements.create(input)   // → Announcement (draft)
api.admin.announcements.send(id)        // → { delivered: number }
api.admin.announcements.schedule(id, sendAt)
api.admin.announcements.previewAudience(segmentRules)
  // → { count: number, sample: Array<{ id, displayName }> }
api.admin.announcements.recipients(id)
  // → { items: Array<{ profile, deliveredAt, readAt }> }
```

---

## Acceptance checks

1. Type a long title and confirm the preview truncates the way the creator's
   inbox will.
2. Change the segment rules and confirm the audience count updates live.
3. Clear all rules and confirm the count reads as the whole roster.
4. Send an announcement, switch to the creator role, and confirm it appears in
   `/notifications` with the deep link working.
5. Open it as the creator, return to admin, and confirm the read count
   incremented.
6. Schedule one for the future and confirm it lands in Scheduled, not Sent.
7. Confirm there is no channel picker offering email or WhatsApp.
8. Confirm no horizontal scroll at 768px.

---

## Open questions for the client

- Can a scheduled announcement be edited, or only cancelled and rewritten?
- Should creators be able to mute announcements entirely, or only
  non-critical categories?
