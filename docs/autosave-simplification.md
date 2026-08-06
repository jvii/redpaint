# Autosave — simplification design

Status: proposed 2026-07-23, not implemented. A review of the browser-autosave
stack (`src/persistence/`, `useDocumentAutosave.ts`) after its first week,
prompted by the feeling that edge-case fixes were piling up — tabs messaging
each other, staleness windows, a three-knob write scheduler. The conclusion:
the core design is right, but three mechanisms coordinate through shared
mutable state plus timing heuristics, and each has a form that needs neither.
Every recent race fix (`3bf5d99`, `13c470d`, `becdf10`, `6879e90`) patched a
race the current form created; the forms below remove the race surface
instead.

## Not up for change

These earn their place and are assumed by everything below:

- **Per-tab records, restore-your-own-only, silent restore.** The semantics
  are right; "no adoption" deliberately removed spooky cross-tab behavior.
- **The write itself**: the undo snapshot reused instead of a GPU readback,
  1-byte packed rasters, `json()` unwrap, buffer copy before structured
  clone.
- **`idb.ts`** as-is: the held connection is what lets the `pagehide` write
  land; resolve-don't-throw is the right contract for a convenience feature.
- **Record validation, version-discard-not-migrate, prune at load.**
- The **scope** of the record (picture, not session state; no undo history).

## 1. Tab identity: ask the platform, not the other tabs

`tabIdentity.ts` exists to answer one question at startup: *is the id we
inherited from sessionStorage already in use by a live tab* (i.e. were we
duplicated)? Today that answer is assembled from four parts: a
BroadcastChannel query protocol (`in-use?`/`in-use`), a 250 ms reply
timeout, a responder that must shut itself down on `pagehide` (else a
reloading tab answers its own question — `3bf5d99`), and a
`performance.getEntriesByType('navigation')` check to avoid asking at all on
reload/history traversal.

The Web Locks API answers the same question by construction:

```ts
// settle the id once per page load
const inherited = sessionStorage.getItem(TAB_KEY);
let id = inherited ?? newId();
const granted = await new Promise<boolean>((resolve) => {
  void navigator.locks.request(`redpaint.tab.${id}`, { ifAvailable: true }, (lock) => {
    resolve(lock !== null);
    return lock ? holdForever : Promise.resolve(); // released when the tab dies
  });
});
if (!granted) {
  id = newId(); // a live tab holds it: we are the duplicate
  // acquire the new id's lock the same way (fresh uuid: uncontended)
}
```

Why this is not just shorter but *stronger*:

- A lock is held by a document and released automatically when the document
  is destroyed. Within one tab, the old document is unloaded before the new
  one runs script, so a reload finds its own lock free — the
  self-duplicate-report bug cannot be expressed. No responder lifecycle, no
  `pagehide` handler.
- `ifAvailable` answers immediately. No reply timeout, no 250 ms worst-case
  startup wait, no "long enough for a live tab to answer" tuning.
- The `couldBeACopy()` navigation-type heuristic becomes unnecessary — the
  reload case is handled by lock lifetime, not classified up front. (It can
  be kept as a fast path, but it is no longer load-bearing.)
- Nothing is left behind to clean up, which was the argument for
  ask-the-tabs over the localStorage registry — locks keep that property.

Fallback: `navigator.locks` undefined (very old browsers) → keep the
inherited id, same as the current `BroadcastChannel`-undefined fallback.

Tradeoff, stated honestly: **a held Web Lock makes the page ineligible for
back/forward cache in Chromium.** For this app that is a small cost — the
restore machinery already treats history traversal as the same tab
continuing, and a bfcache miss lands on exactly the restore path this
feature exists to make painless — but it is a real behavior change and the
one reason to say no. (The current open `BroadcastChannel` responder has
its own bfcache implications in some browsers; today's code closes it on
`pagehide` partly for that reason.)

`tabIdentity.ts` goes from 137 lines of protocol to roughly 40, and
`ensureTabId()` keeps its exact signature — nothing else changes.

## 2. Restore guard: one key per tab, no staleness window

Everything subtle in `restoreGuard.ts` follows from one decision: a single
`localStorage` key shared by every tab on the origin. Because another tab's
in-progress restore is indistinguishable from our own dead one, the marker
holds a timestamp, a 15-second staleness window decides which it is, and the
marker records *which record* was being applied so the right one gets
dropped (`13c470d`).

Make the marker per-tab and the ambiguity ceases to exist. A small
`guard:<tabId>` entry in the same IndexedDB store:

```
loadDocument():
  await idbSet('guard:' + tabId(), recordKey)   // landed before the risky apply
  ... apply ...
  await idbDelete('guard:' + tabId())           // finishRestore()
```

A guard entry found at startup can only mean *our* last attempt died — no
other tab writes our key (duplicated tabs get fresh ids before this runs).
So: no timestamp, no `GUARD_STALE_MS`, no "recent enough to be another tab"
reasoning, no localStorage at all. The existing prune cleans up guard
entries of dead tabs alongside their records.

The current comment argues localStorage is needed because "only a
synchronous write guarantees" the marker lands before the crash. The awaited
IndexedDB put gives the same ordering — the transaction has committed before
`apply` begins; the only crash it can miss is one during the await itself,
where nothing dangerous is running. One extra tiny IDB write per
startup-with-record is the entire cost.

`restoreGuard.ts` (71 lines) dissolves into ~10 lines of `documentAutosave.ts`.

## 3. Write scheduling: a plain throttle

The scheduler in `useDocumentAutosave.ts` is the archaeological record of
its own bug history: a debounce (original), plus a max-wait so steady
painting cannot starve it (`becdf10`), plus a leading edge so the first
stroke is not 400 ms naked (`5dc7294`). Three constants and two refs
(`pendingSince`, `lastWriteAt`) and a `Math.max(0, Math.min(...))` to
reconcile them.

What those three fixes converge on is the standard **leading+trailing
throttle**:

- a change arrives with ≥ `WRITE_INTERVAL_MS` since the last write → write
  now (leading edge — first stroke covered);
- otherwise, if no trailing write is scheduled, schedule one for
  `lastWriteAt + WRITE_INTERVAL_MS` (coalesces the flurry, and bounds
  staleness at one interval — strictly tighter than today's 1500 ms
  `WRITE_MAX_WAIT_MS`, which exists only because the debounce could
  starve).

One constant instead of two, one ref instead of two, no starvation case to
reason about. The writes were made cheap precisely so they could be frequent
(`268c080`, `78c11cf`); an interval of 400–1000 ms is fine either way. The
`pagehide`/`visibilitychange` flush stays exactly as is — it narrows the
trailing window, same as today.

## 4. Startup: sequence the fit and the restore, don't referee them

The auto-fit (`39c1e9a`) and the restore both want to decide the startup
canvas, they run concurrently, and `hasPendingCanvasContent()` inside
`setStartupResolution` is the referee (`6879e90`). Guarding the race means
every future startup participant must remember to check the same flag.

The simpler shape is to not have the race: the startup fit runs only after
the restore has resolved — *restore, else fit*. `loadDocument()` settles in
milliseconds (one IDB read); gate the initial fit on that promise (the
restore hook already knows the answer; expose it, or just kick the fit from
the same effect's `else` branch). The `hasPendingCanvasContent()` check in
`setStartupResolution` then loses its startup justification — it can stay as
a cheap invariant, but nothing depends on winning a race anymore.

(The `queueMicrotask` in `hooks.tsx` is unrelated to autosave — it is the
standard React commit-phase workaround for the undo-across-resize repaint —
and is not part of this proposal.)

## What this removes, all told

| Gone | Was there because |
| --- | --- |
| BroadcastChannel query protocol + responder + its `pagehide` shutdown | duplicated tabs share sessionStorage |
| 250 ms reply timeout | a dead tab answers nothing |
| `couldBeACopy()` navigation-type heuristic | asking on reload was self-defeating |
| Guard timestamp + 15 s staleness window + shared-key reasoning | one localStorage key for all tabs |
| `WRITE_MAX_WAIT_MS` + `pendingSince` ref + starvation reasoning | debounce restarted per stroke |
| Startup race refereeing (as a load-bearing mechanism) | fit and restore ran concurrently |

Roughly 150–200 lines, and — the real point — three whole categories of
"two tabs at just the wrong moment" and "the timer restarted at just the
wrong moment" reasoning.

## Verification (when implemented)

- Duplicate-tab matrix, per browser (Chromium/Firefox/Safari): reload keeps
  the record; Duplicate Tab gets a fresh id and blank canvas while the
  original keeps painting; window.open/link likewise; two tabs painting
  concurrently keep separate records.
- Reload storms: hold Cmd-R — the record must survive every cycle (this is
  the case the old registry lost and the lock lifetime must win).
- bfcache: navigate away and Back in Chromium — expect a full reload (lock
  cost, accepted) and a correct restore.
- Kill the tab mid-apply (devtools "pause then close") → next start drops
  that record once, paints a blank canvas, and does not touch other tabs'
  records.
- Steady painting for 30 s: writes land every interval (watch
  `__redpaint.autosaveState()`), and a hard reload mid-stroke loses at most
  one interval.
- `npm test` — the scheduler's throttle timing and the guard's
  read-mark-apply-clear sequence are pure enough to unit test if extracted;
  the rest stays browser-verified per repo convention.

## Out of scope

- A Restore requester for adopting another tab's (or a closed tab's) record
  — the deliberate-act UI the no-adoption decision pointed at.
- Any change to what is recorded (undo history stays out).
- The React 19 `useEffectEvent` cleanup of the `writeNow` ref pattern —
  worth doing whenever the codebase adopts it generally, not specific to
  autosave.
