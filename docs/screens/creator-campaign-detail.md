# Creator — Campaign detail

**Track A.** Route: `/campaigns/[id]`. **Built**, with gaps noted.

---

## Why this screen exists

Where a creator decides whether to take a campaign. Everything they need to
make that decision is on this screen, above the accept action, because
accepting without reading the brief is how a creator ends up producing the
wrong thing.

Per the client decision: **fee, deadlines, deliverables and the full brief are
all visible before accepting.** No fee reveal after the fact.

---

## Layout, top to bottom

1. Back link to campaigns.
2. Brand name, campaign name as `h1`, participation `StatusPill`, and any
   status help text (`PARTICIPATION_HELP`).
3. **Commercials card** — the fee via `formatMoney` with `tabular`, the
   go-live window, and a plain line that Puzzle Media settles payments outside
   the app once work is approved and the link verified.
4. **What you will make** — each deliverable with its type icon, due date and
   status pill.
5. **The brief** — summary, what to make, must include, must avoid, tone, and
   the tags to use in `font-mono` so they can be copied accurately.
6. **Actions**, sticky at the bottom: accept, decline, or withdraw depending
   on the participation state machine.

Actions come last deliberately. By the time a creator reaches them they have
scrolled past everything the decision depends on.

---

## Participation states

Actions come from `creatorActions(mode, status)` — never hardcode which
buttons show. The three machines are on one discriminator, and **Expired is
not Declined**: a creator who never saw an invitation has not refused it.

| Status | Shows |
|---|---|
| `invited` | Accept, Decline, and the accept-by countdown |
| `expired` | No actions. "This invitation expired before you responded. Puzzle Media may invite you again." |
| `declined` | No actions. "You declined this campaign." |
| `accepted` / `active` | Withdraw only |
| `withdrawn` | No actions, plus the reason they gave |
| `removed` | No actions. Neutral wording — say Puzzle Media removed them from the campaign, not why, since the reason is internal. |

### Fee visibility

Gated on `assignment.visible_to_creator`. When false the fee area is
**absent from the DOM**, not blurred or hidden by CSS — a blurred value is
still readable in devtools.

---

## Withdrawal

Available any time before the post goes live. A dialog takes a reason, at
least five characters.

Once any work has been submitted, show the warning from
`withdrawalWarning(hasSubmitted)`: withdrawing is recorded on their history
and Puzzle Media will need to find a replacement. Warn, do not block.

---

## Gap: brief changes (A2)

**Not built.** Editing a live brief is the highest-risk admin action in the
product, because a creator may already be working to v1.

When `campaign.brief_version` is greater than the version the creator saw:

- A banner at the top of the brief section: "This brief changed on 12 March."
- The brief renders the current version.
- The version history is reachable, showing when each version was published.
- Acknowledging is timestamped, so there is a record the creator saw it.

No diff view. A timestamped acknowledgement is what a dispute needs; a diff is
a nice-to-have that costs more than it returns here.

Needs: `api.campaigns.acknowledgeBrief(campaignId, version)` and a
`brief_changed` notification type.

---

## Acceptance checks

At 360×640:

1. Open an invitation and confirm fee, deadlines, deliverables and the full
   brief are all visible before reaching the accept button.
2. Accept and confirm the first task appears on `/home` within one refresh.
3. Open an expired invitation and confirm no actions render and the copy
   differs from a declined one.
4. Set `visible_to_creator` false in the seed and confirm the fee is absent
   from the DOM, not merely hidden.
5. Withdraw after submitting a script and confirm the warning appears and a
   reason is required.
6. Confirm no horizontal scroll and every action is at least 44px tall.
