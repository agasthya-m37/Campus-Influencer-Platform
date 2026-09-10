# Shared-code requests

**Track B writes here. Track A implements.**

Track B does not edit shared code — tokens, the API layer, domain rules, or
shared components. When you need something that does not exist, add an entry
below and build against the shape you specified. Track A picks these up with
priority over its own polish work, because a blocked track is more expensive
than a slightly rougher screen.

If you are genuinely blocked and cannot proceed, say so in the entry and stub
it locally inside `src/features/admin/` — never in shared code — and mark the
entry so the stub gets removed when the real thing lands.

---

## How to write an entry

```markdown
### R-00 — Short title
**Track B, 2026-09-11 · Blocking: docs/screens/admin-campaigns.md B1**

What you need and why the existing surface does not cover it.

**Proposed shape**
```ts
api.admin.campaigns.list(filter?) // → { items: [...] }
```

**Status:** requested → in progress → landed
```

Keep the shape concrete. A request phrased as "some way to get campaigns" gets
a guess back; one with a signature gets what you asked for.

---

## Open requests

_None yet._

---

## Landed

_None yet._

---

## Known upcoming

Anticipated from the specs, so Track A can start before being asked. Track B
should still file a request when it actually needs one, since the shape may
have moved.

| For | Endpoints |
|---|---|
| `admin-campaigns.md` | `admin.campaigns.list/get/create/update/publish/clone/setStatus`, `admin.campaigns.previewEligibility`, `admin.assignments.replace` |
| `admin-creators.md` | `admin.creators.list(filter)`, `admin.creators.get`, `admin.creators.applications`, `admin.creators.decide`, `admin.creators.bulkInvite` |
| `admin-metrics.md` | `admin.metrics.queue/get/acceptAll/requestBetterEvidence` |
| `admin-events.md` | `admin.events.*`, `admin.speakers.*` |
| `admin-announcements.md` | `admin.announcements.*` |
| `admin-overview.md` | Extend `admin.overview()` with urgency and at-risk campaigns |
| `admin-audit.md` | Filtering, cursor pagination, audited export |

### Shared components Track B is likely to need

| Component | Why |
|---|---|
| `DataTable` | Sortable, selectable rows with a bulk-action bar. Five admin screens want the same thing; building it once in `components/patterns/` is worth it. |
| `FilterBar` | Active-filter count, clear-all, consistent layout |
| `EligibilityRuleBuilder` | Campaigns, events and announcements all target by the same rules |
| `ReasonDialog` | Confirmation plus a mandatory reason. Exists inline in the creator campaign screen; should be extracted. |
| `AudienceCount` | Live matching count beside a rule builder |

File a request for each when you reach the screen that needs it, rather than
all at once — the shape is clearer with a real use in front of it.
