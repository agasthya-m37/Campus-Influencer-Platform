# Screen specifications

One document per screen. Each carries why the screen exists, its layout, all
four states, the data it needs, its interactions and edge cases, acceptance
checks to run in a browser, and open questions for the client.

**These change as client requirements land.** When a spec and the code
disagree, the spec is the intent and the code is the current state. Update the
spec in the same commit as the code so the document stays true.

## Creator portal — Track A

| Spec | Route | State |
|---|---|---|
| `creator-campaign-detail.md` | `/campaigns/[id]` | Built; brief versioning outstanding |
| `creator-metrics-submit.md` | `/deliverables/[id]/results` | **Not built** |
| `creator-profile.md` | `/profile` | Built; notification preferences outstanding |
| `creator-pwa.md` | manifest + service worker | **Not built** |

Built and not yet specced, since they work and are stable: `/login`,
`/onboarding/[step]`, `/home`, `/campaigns`, `/tasks`,
`/deliverables/[id]` and its submit and go-live children, `/performance`,
`/earnings`, `/learn`, `/notifications`. Write a spec when one changes
materially.

## Admin console — Track B

| Spec | Route | State |
|---|---|---|
| `admin-overview.md` | `/admin/overview` | Built shallow; deepen |
| `admin-campaigns.md` | `/admin/campaigns` | **Not built** — largest piece |
| `admin-creators.md` | `/admin/creators` | List built; detail and applications outstanding |
| `admin-metrics.md` | `/admin/metrics` | **Not built** |
| `admin-events.md` | `/admin/events` | **Not built** |
| `admin-announcements.md` | `/admin/announcements` | **Not built** |
| `admin-audit.md` | `/admin/audit` | Built read-only; add filtering |

Content review at `/admin/review` reuses the shared reviewer screens and needs
no separate spec. Do not fork those components.

## Writing a new spec

Follow the existing shape:

1. **Why this screen exists** — the job it does, and the one constraint that
   shapes it most.
2. **Layout** — top to bottom, at the design width.
3. **States** — loading, empty, error, loaded, plus any domain-specific ones.
4. **Data** — the endpoints, with shapes if they do not exist yet.
5. **Interactions and validation** — including what should warn rather than
   block.
6. **Acceptance checks** — numbered, runnable in a browser.
7. **Open questions for the client** — anything you had to assume.

Prefer explaining a constraint over describing a control. "Waitlist must look
equal to approve, or reject gets over-used on students with small followings"
tells the next person more than "add a waitlist button".
