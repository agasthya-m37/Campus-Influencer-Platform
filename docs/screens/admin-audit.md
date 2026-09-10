# Admin — Audit log

**Track B.** Route: `/admin/audit`.

Append-only. The product's defence in any dispute.

---

## Why this screen exists

The single most valuable property of this system over a shared drive is that
nobody can quietly change what was approved. The audit log is where that
property becomes visible.

It is consulted rarely and urgently: a brand disputes an approval, a creator
disputes a rejection, somebody asks who changed a fee. Design for the person
who arrives knowing roughly what they are looking for and needing it fast.

---

## Layout

### Filters

Four, combining with AND:

| Filter | Control |
|---|---|
| Actor | select of admin users, plus "anyone" |
| Entity type | select — campaign, assignment, submission, review, live post, metric, earning, user |
| Action | select, grouped by entity |
| Date range | two dates, defaulting to the last 7 days |

Plus a free-text search across the reason field, since reasons are where the
useful detail lives.

### The list

Newest first. Each entry:

- **Action** in `font-mono` — `review.reject`, `assignment.removed`.
- **Actor** and **timestamp** via `formatFull`, so a dispute has an exact time
  with a timezone.
- **Entity type and id**, linking to the record where one exists.
- **Reason**, rendered in full and never truncated. A truncated reason is
  useless in the only situation this screen is used.
- **Impersonator**, when the action was taken in support mode, shown
  prominently: "Priya Nair acting as Ananya Rao".

Group by day with a sticky date header, so scanning a range has structure.

### Export

CSV of the current filter. **The export is itself audited** — record who
exported what range and when, and say so beside the button so nobody is
surprised.

---

## What must never appear

- No edit action. No delete action. Not disabled, absent.
- No pagination that loses ordering — use a cursor, not an offset that shifts
  as new entries arrive.

---

## Endpoints

`api.admin.audit()` returns the most recent 200 unfiltered. Extend:

```ts
api.admin.audit(filter?: {
  actorId?: string; entityType?: string; action?: string;
  from?: string; to?: string; q?: string;
  cursor?: string; limit?: number;
}) // → { items: AuditLog[], nextCursor: string | null }

api.admin.audit.export(filter)  // → { url: string }  — writes its own audit entry
```

---

## Acceptance checks

1. Filter by actor and confirm only that actor's entries remain.
2. Filter to a date range with no entries and confirm a clear empty state
   naming the range, not a generic one.
3. Confirm a long reason renders in full.
4. Confirm entries with an impersonator show both identities.
5. Export and confirm a new audit entry appears recording the export.
6. Confirm no edit or delete affordance exists anywhere on the screen.
7. Confirm no horizontal scroll at 768px.
