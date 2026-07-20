---
name: verify
description: Drive the running dxpaint app headlessly over CDP to verify changes end-to-end (screenshots, mouse/keyboard input)
---

# Verifying dxpaint in a real browser

## Launch

- Dev server: `npm start` (port 3000, pinned in vite.config.ts). Check first:
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` — it is often
  already running.
- Headless Chrome with CDP (don't reuse 9222, it may be a real session):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --remote-debugging-port=9223 --user-data-dir=<scratchpad>/chrome-profile \
  --no-first-run http://localhost:3000 &
```

## Drive

Node 22+ has a global WebSocket, so raw CDP needs no dependencies. A reusable
driver lives in the session scratchpad as `cdp.mjs` (recreate if gone: connect
to the page target's `webSocketDebuggerUrl` from `http://localhost:9223/json`,
then `Runtime.evaluate`, `Input.dispatchMouseEvent`/`dispatchKeyEvent`,
`Page.captureScreenshot`). Run scripts as `node cdp.mjs <script.mjs>` where the
script default-exports `async (cdp) => {...}`.

Gotchas that cost time:

- Window is small (~756x469); canvas at roughly (0,51)-(674,469), toolbox on
  the right edge from x=675.
- Locate toolbox buttons by class (`toolbox__button--freehand`,
  `--brushselect`, ...) via `getBoundingClientRect`, not hardcoded pixels.
  Built-in brush dots are the unlabeled top rows around y=61-100.
- The menu (spacebar toggles) unmounts its content while closed (`.menu__main`
  etc. aren't in the DOM at all) — open it first, or selectors for its items
  will just come back empty/null.
- Real keyboard hotkeys: dispatch both keyDown (with `text`) and keyUp;
  modifiers bitmask: alt=1 ctrl=2 meta=4 shift=8.
- Zoomed evidence: `Page.captureScreenshot` with `clip: {x,y,width,height,
  scale: 4}` beats squinting at full-window shots.
- Committed pixels are better evidence than the overlay cursor: stamp the
  brush onto the canvas at distinct spots and screenshot once at the end.
