# Creator — Profile

**Track A.** Route: `/profile`. **Built**, with gaps noted.

---

## Why this screen exists

Three jobs: show the creator what Puzzle Media knows about them, let them fix
it, and hold the record of what they agreed to.

The consent section is not decoration. Four separate declarations, each with
the document version, timestamp, IP and user agent, kept append-only. It is
what makes a content-usage dispute answerable.

---

## Sections

1. **Identity** — name, course, year, graduation year, bio.
2. **Completeness** — a percentage with a `Progress` bar and the specific
   missing fields listed and linked. A score without the list is a nag; with
   the list it is a task.
3. **Accounts** — each social account: platform icon, handle via
   `formatHandle`, followers, account type badge, and what that type means for
   them. A personal account should say plainly that results cannot sync and
   they will add numbers themselves.
4. **What you agreed to** — the four consent records with version and
   timestamp. Read-only.
5. **Settings** — theme toggle, sign out, and the signed-in number.

---

## Gap: notification preferences (A3)

**Not built.** Add a preferences section:

| Category | Mutable |
|---|---|
| Campaign invitations | Yes |
| Announcements | Yes |
| Events and workshops | Yes |
| **Task reminders** | **No** |
| **Review decisions** | **No** |

The last two cannot be muted, and the UI should show them as always-on with a
short explanation rather than as disabled toggles with no reason. Muting the
notification that says "your script needs changes" would break the product's
core loop.

Needs `api.me.updateNotificationPreferences(prefs)` and a `preferences` field
on the profile.

---

## Gap: editing after approval

Currently the profile is read-only post-approval. A creator changing college
or adding an account has no path. Decide with the client whether edits go
straight through or re-enter a review queue.

---

## Acceptance checks

At 360×640:

1. Confirm the completeness score lists the specific missing fields, each
   linking to where it is fixed.
2. Confirm a personal-account row explains that results will not sync.
3. Confirm all four consent records show version and full timestamp.
4. Toggle the theme and confirm it persists across a reload.
5. Once built: mute announcements, trigger one from admin, and confirm it does
   not arrive. Then confirm a review decision still does.
6. Confirm no horizontal scroll and every control is at least 44px.
