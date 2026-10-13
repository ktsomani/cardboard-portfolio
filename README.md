# Design Engineering Portfolio — three demos + a portfolio shell

A pnpm workspace of four Vite apps. Each demo takes on a hard part of building
rich interfaces in a browser — a non-linear editor, GPU-driven graphics, and
retrieval over footage — rather than being a generic showcase.

| App | Port | What it is |
| --- | --- | --- |
| `apps/portfolio` | 5180 | The page you read first; hosts and frames the three demos |
| `apps/timeline` | 5181 | Browser-native NLE surface: drag, trim, snap, ripple, undo |
| `apps/webgl` | 5182 | Motion studio: custom GLSL vertex/fragment shaders, live controls |
| `apps/ai-search` | 5183 | Multimodal footage search with a visible reasoning panel |

## Run it

```bash
pnpm install
pnpm dev          # all four, in parallel
```

Or individually:

```bash
pnpm --filter @portfolio/timeline dev
pnpm --filter @portfolio/webgl dev
pnpm --filter @portfolio/ai-search dev
pnpm --filter @portfolio/portfolio dev
```

Production builds: `pnpm build`. Every app builds clean and the workspace has no
type or import errors.

## What is real, and what is simulated

Being precise about this matters more than the feature list, so each app says it
in the UI as well as here.

**Real:** all layout, interaction, animation and rendering. The timeline's
snapping maths, non-destructive trimming, zoom-aware scale and undo model. The
GLSL shaders (hand-written, shown verbatim in-app). The search scoring, ranking
and evidence attribution.

**Simulated, deliberately:**

- **Collaboration in the timeline.** There is no server, no CRDT and no real
  peer. Remote cursors, presence and the remote edits that land in the activity
  feed are driven by a local scheduler so the *interaction* can be felt and
  judged. The transport is the part that would be replaced with a real channel;
  the surface above it is already written as if the data were remote.
- **The search "pipeline" staging.** The four stages are a timed choreography.
  The scores are genuine — computed by the local scorer — but their reveal is
  paced so ranking reads as considered rather than dumped.
- **No model anywhere.** Search is bag-of-words scoring with field weights and a
  small synonym table. The reported latency is the measured local scoring pass,
  never a simulated network call.
- **The 3D "retrieval space" is not a latent space.** A 14-clip corpus does not
  have a meaningful embedding projection. Radius encodes match strength and
  angle encodes rank, which is legible and true to the actual scores.

## Architecture notes

- **Time is the source of truth in the timeline.** Clips store `start` and
  `duration` in seconds; pixels are derived from `pxPerSec`. Drags convert
  pointer pixels to seconds once, then snap in pixel space, which is what makes
  the feel zoom-independent.
- **Snapping tolerance is a pixel budget, not a time budget.** Object snaps use a
  wider tolerance than grid snaps, so clips prefer neighbouring edges over the
  grid. `Alt` bypasses snapping mid-drag.
- **One undo entry per gesture.** Drags stream transient updates that skip the
  history stack; the pre-drag state is captured once, guarded by a
  `gestureActive` flag in the reducer.
- **Uniforms are written in `useFrame`, never through React state.** No animation
  frame triggers a reconciliation in the WebGL studio.
- **Clips do not use Framer's `layout` prop.** It re-measures the whole tree per
  frame, and during playback the playhead updates at 60fps. Absolute positioning
  is both faster and more correct — a dragged clip tracks the cursor exactly.
- **`design.md` in spirit:** the token layer is shared across all four apps
  (`--color-ink-*`, `--color-accent`, one type scale) so the demos read as one
  product rather than four exercises.

## Verification scripts

Five checks, in increasing order of what they can catch:

```bash
node scripts/verify-shaders.mjs    # shader exports, balanced braces, uniform wiring, stray backticks
node scripts/verify-search.mjs     # ranking sanity + negative case for junk queries
powershell -ExecutionPolicy Bypass -File scripts/verify-servers.ps1      # all four apps serve, modules transform
node scripts/run-scenarios.mjs [name] [--dev]   # 28 behavioural assertions in a real browser
powershell -ExecutionPolicy Bypass -File scripts/capture-screenshots.ps1 # load-state screenshots of all four
```

Three more for checking the **deployed** site:

```bash
node scripts/screenshot-live.mjs <url> <out.png> [waitMs]  # screenshot with wall-clock timing
node scripts/probe-live.mjs <url>           # find invisible-but-present elements + console errors
node scripts/verify-embed.mjs <portfolioUrl> # prove a cross-origin demo iframe actually loads
```

`screenshot-live.mjs` deliberately avoids Chrome's `--virtual-time-budget`.
Virtual time fast-forwards timers, which leaves animations stuck at their initial
state — an entrance animation that starts at `opacity: 0` then renders as a
**blank page** in the screenshot even though the DOM is correct and a visitor
sees it fine. That produced a false "the site is broken" reading once; the
wall-clock version reports `h1 opacity: 1` and screenshots correctly.

`verify-shaders.mjs` exists because a GLSL compile error does not fail a JS
build — it produces a blank canvas at runtime. `verify-search.mjs` asserts that
junk queries return *nothing* rather than noise.

`run-scenarios.mjs` is the behavioural layer: it speaks the Chrome DevTools
Protocol over Node's built-in WebSocket (no dependencies) and drives the real
UI — real key events, real mouse drags, real clicks — then asserts against state
the timeline exposes via data attributes. Scraping rendered text proved
ambiguous (several timecodes on screen at once), which produced false failures.

It runs against the **production build** (`vite preview`) by default, because
that is what ships: React's development-only warnings and the Vite HMR overlay
add console noise that is not part of the product. Pass `--dev` to point it at
the dev servers instead.

### Last full run (production builds)

| Layer | Result |
| --- | --- |
| 4 production builds | all exit 0 |
| 4 dev servers, 38 modules | 0 failures |
| shader static checks | 0 failures |
| retrieval ranking + negative case | 0 failures |
| **behavioural suite** | **28 assertions, 0 failures, 0 console errors** |

Behavioural coverage, by scenario:

- **timeline-shortcuts** — Space start/stop, split by keyboard, the split no-op
  explanation, click-moves-playhead, undo of split and delete, zoom in/out/reset
- **timeline-trim** — trimming the left edge moves it while the right edge stays
  pinned (measured drift: 0px)
- **search-facets** — a facet narrows results; "clear filters" restores them
  without resetting the query
- **search-no-results** — a junk query yields zero cards and a real empty state
- **portfolio-nav** — sections present, in-progress status and the simulation
  disclaimer both visible, no iframe until asked, embed mounts on click
- **motion-controls** — canvas present, glitch toggle flips, GLSL source and the
  dither implementation are readable in-app

### Bugs the behavioural suite caught

Load-state screenshots pass happily while interactions are broken, because a
silent no-op looks exactly like "nothing happened". These were all found by
driving the real UI:

1. **Silent `S`.** Splitting with a clip selected but the playhead outside it did
   nothing and said nothing — the failure toast only fired when nothing was
   selected. Both entry points (button and key) now route through the reducer,
   which reports the reason, so they cannot diverge.
2. **Clicking a clip never moved the playhead.** Clip `pointerdown` correctly
   stops propagation so clipping doesn't scrub the whole lane — but that also
   meant a click selected the clip while leaving the playhead stranded, making
   keyboard split impossible to trigger by clicking. Pressing a clip body now
   parks the playhead where you pressed; trim handles deliberately do not.
3. **Remote edits stole your selection.** The simulated peers dispatched
   `clearSelection` on every edit, which would yank the clip a user is working on
   out from under them. Removed.
4. **Remote edits consumed your undo history.** Peer moves entered the local
   past stack, so a single Ctrl+Z appeared to do nothing. They are now
   `transient` — they land in the document but stay out of your history.
5. **Cursor movement re-rendered the whole timeline.** Peer positions in React
   state meant clips, ruler and lanes re-rendered 60 times a second. They now
   live in a small external store that only the cursor overlay subscribes to,
   committed at ~30fps, and notifications are deferred so they can never land
   mid-render.
6. **Two buttons labelled "clear."** The facet rail's reset and the search
   input's reset shared a label. The facet one is now "clear filters."

### The bug that motivated all of this

The motion studio's control panel rendered perfectly, the FPS counter ticked at
60fps, and the 3D object was **invisible** — a black canvas. Every build and
module check passed.

Cause, from `apps/webgl/tools/shader-test.html`:

```
GLSL: WebGL GLSL ES 3.00
ERROR: 0:157: 'active' : illegal use of reserved word
Fragment shader is not compiled.
centre pixel rgba: [6, 6, 10, 255]
```

`active` is a reserved word in GLSL ES 3.00. Three.js targets ES 1.00, but the
browser compiles shaders as ES 3.00 on a WebGL2 context, so a name that is fine
in one profile is fatal in the other. Renaming the variable fixed it
(`centre pixel rgba: [25, 83, 106, 255]`).

Fixing it introduced a *second* bug: the comment explaining the reserved word
contained backticks, which silently closed the GLSL template literal and turned
the remaining GLSL into JavaScript. `verify-shaders.mjs` now counts backticks in
that file to catch this class of mistake.

`apps/webgl/tools/shader-test.html` is kept as a diagnostic harness: it renders
the real ShaderMaterial in isolation and reports the GL context, program
diagnostics, and a centre-pixel readback, so a blank canvas can be attributed to
the shader, the camera, or the scene.

## Setup gotchas (Windows)

Recorded because they cost real time and are not obvious:

1. **Use Node ≥ 20.19.** The bundled runtime Node is v24; a system Node v22.12
   or older cannot load Vite 7's native bindings.
2. **`@vitejs/plugin-react` 6 requires Vite 8.** This workspace pins Vite 7.3.7
   with plugin-react 5.2.0, which supports Vite 4–8. Mixing v6 with Vite 7 fails
   with `Package subpath './internal' is not defined`.
3. **pnpm 11 blocks dependency build scripts.** `esbuild` needs its platform
   binary placed at install time; approved via `allowBuilds` in
   `pnpm-workspace.yaml`.
4. **Under OneDrive, Vite's native file watcher crashes** with
   `EBUSY: resource busy or locked` on Vite's own temp files, killing the dev
   server mid-session. All four configs use `server.watch.usePolling: true`.
5. **Headless Chrome hangs on an endless `requestAnimationFrame` loop.** Virtual
   time never advances, so `--virtual-time-budget` never expires and `--dump-dom`
   never returns. The diagnostic harness therefore animates a bounded 90 frames.

## Contact details

`apps/portfolio/src/data/projects.js` holds the profile block — name, email,
location and links — which drives the site header, the nav buttons and the
footer. The resume PDF is served from `apps/portfolio/public/`.

## Publishing

See [GITHUB-UPLOAD.md](GITHUB-UPLOAD.md) for the exact steps to push this repo,
including why the three projects belong in **one** repository rather than three.
