# Creator — PWA and offline shell

**Track A.** Files: `src/app/manifest.ts`, `public/sw.js`.

---

## Why this exists

The creator portal is a phone app in everything but distribution. Installing
it to the home screen removes the browser chrome and the "which tab was it"
problem, and the offline shell means opening it in a lift does not show a
dinosaur.

**The hard rule: no offline write path.** An unsent submission is a worse
failure than a blocked one. A creator who believes they submitted a script,
because the app accepted it offline and then silently lost it, misses a
deadline and blames the platform — correctly.

---

## Manifest

`src/app/manifest.ts` as a Next metadata route:

| Field | Value |
|---|---|
| name | Puzzle Media Campus |
| short_name | Puzzle Campus |
| start_url | `/home` |
| display | `standalone` |
| background_color | `#fbfaf7` (bone, matching light mode) |
| theme_color | `#fbfaf7` |
| icons | 192, 512, and a 512 maskable |

---

## Service worker

Hand-written in `public/sw.js`, roughly sixty lines. **Not** a Workbox plugin:
the no-offline-writes rule must be auditable at a glance, and Workbox-based
tooling defaults toward background sync, which is precisely the behaviour that
must not exist here.

### Strategy

| Request | Strategy |
|---|---|
| Navigation (`mode: "navigate"`) | Network first, falling back to the cached shell, then to `/offline` |
| Static assets (`/_next/static/*`, fonts) | Cache first — content-hashed, so they never go stale |
| Everything else, and **all non-GET** | Pass straight through to the network. Never cached, never queued. |

Make the non-GET case an explicit early return with a comment saying why, so
the rule survives the next person editing this file.

### Versioning

A `CACHE_VERSION` constant. On `activate`, delete every cache whose key does
not match. Bump it when the shell changes.

---

## Offline experience

**A persistent banner** when `navigator.onLine` is false: "You're offline. You
can look around, but you can't submit." Remove it on `online`.

**Disable submit actions while offline** rather than letting them fail. The
button reads "Offline" and is disabled, so nobody taps it twice and wonders.

**An `/offline` route** for navigation that misses cache entirely: the brand
mark, a line explaining the app needs a connection for this page, and a retry
button.

---

## Acceptance checks

1. Run a production build, open in Chrome, and confirm the install prompt
   appears and the app installs to the home screen.
2. Launch from the home screen and confirm no browser chrome.
3. Go offline and reload `/home`. The shell renders from cache.
4. While offline, open a submission form and confirm the submit button is
   disabled and labelled, not merely failing on tap.
5. While offline, confirm nothing is queued: return online and confirm no
   delayed submission fires.
6. Navigate offline to an uncached route and confirm `/offline` renders.
7. Bump `CACHE_VERSION`, reload twice, and confirm old caches are deleted.
8. Run Lighthouse mobile and confirm the PWA checks pass and LCP stays within
   the 3s budget on throttled 4G.
