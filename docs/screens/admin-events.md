# Admin — Events and workshops

**Track B.** Routes: `/admin/events`, `/admin/events/new`,
`/admin/events/[id]`, `/admin/events/[id]/attendance`.

The learning programme Puzzle Media runs alongside campaigns.

---

## Why this screen exists

Puzzle Media runs workshops for its creators: how to write a hook, what ASCI
disclosure actually requires. These are part of what makes the network worth
joining, not an afterthought.

Note one boundary from the client decisions: **brands do not see event
activity at all.** Nothing on these screens is exposed to a brand reviewer.

---

## 1. Event list — `/admin/events`

Split into **Upcoming** and **Past** with counts. Upcoming sorted soonest
first, past sorted most recent first.

Each row: title, date and time, format (online or in person), the speaker,
and capacity as `going / capacity` with a waitlist count when non-zero.

Actions per row: edit, duplicate, cancel (reason required), open attendance.

---

## 2. Create and edit — `/admin/events/new`, `/admin/events/[id]`

### Event details

| Field | Type | Validation |
|---|---|---|
| Title | text | Required, min 5 |
| Description | textarea | Required, min 20 |
| Type | select | workshop, webinar, meetup, training |
| Format | radio | online, in person |
| Starts / ends | datetime | Required, end after start |
| Venue | text | Required when in person |
| Link | url | Required when online |
| Capacity | number | Required, min 1 |
| RSVP deadline | datetime | Required, before start |

### Speaker

Either pick an existing speaker or create one inline:

photo, name, title, bio, expertise tags, social links.

The creator-facing screen renders this as a "Know the speaker" section, so
the bio should read as a paragraph a student would actually want to read, not
a corporate blurb. Say so in the field's helper text.

### Targeting

The same eligibility rule builder the campaign form uses — cities, colleges,
categories, languages, follower band — with a live matching count. An empty
rule set means everybody.

### Post-event resources

Added after the event: recording link, presentation, assignment, feedback
form. Leave the section visible but disabled before the event has happened,
so the operator knows it exists.

---

## 3. Attendance — `/admin/events/[id]/attendance`

### Sections

**Going** — RSVPs confirmed. Each row has a check-in toggle.
**Waitlist** — in order. Promotion is automatic on a cancellation, but show
the order so an operator can explain it.
**Cancelled** — who dropped out and when.

### Check-in

A search field at the top, because at the door an operator is typing a name
against a queue of people. Toggling check-in is immediate and reversible; do
not require a confirmation for it.

After the event, a **Mark completion** action sets `completed_at` for
everyone checked in.

### Export

CSV of attendees: name, college, email, RSVP state, checked in, completed.

---

## Endpoints

`api.events.rsvp(id)` exists for the creator side. Needed for admin:

```ts
api.admin.events.list()
  // → { upcoming: EventRow[], past: EventRow[] }
api.admin.events.get(id)
  // → { event, speaker, rsvps: Array<{ rsvp, profile }>, counts }
api.admin.events.create(input)  // → CampusEvent
api.admin.events.update(id, input)
api.admin.events.cancel(id, reason)
api.admin.events.checkIn(rsvpId, checkedIn: boolean)
api.admin.events.markCompletion(eventId)
api.admin.speakers.list()
api.admin.speakers.create(input)  // → Speaker
```

---

## Acceptance checks

1. Create an online event and confirm Link is required and Venue is not; flip
   to in person and confirm the inverse.
2. Set an RSVP deadline after the start time and confirm validation blocks it.
3. Fill capacity, then RSVP as a creator and confirm they land on the
   waitlist rather than being refused.
4. Cancel a confirmed RSVP and confirm the first waitlisted person is
   promoted automatically and the counts update.
5. Check somebody in, reload, and confirm it persisted.
6. Export the attendee CSV and confirm it opens in a spreadsheet with the
   right columns.
7. Sign in as a brand reviewer and confirm no event surface is reachable.
8. Confirm no horizontal scroll at 768px.

---

## Open questions for the client

- Should a waitlisted creator be told their position, or only that they are
  waitlisted?
- Does event attendance feed anything else — creator tiers, campaign
  eligibility, a certificate?
