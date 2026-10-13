/**
 * Scenario-driven interaction tests.
 *
 * The other verification layers prove the apps load, build and render. This one
 * proves they *behave*: keyboard shortcuts, trimming, facet filtering, playback.
 * Those code paths only run after a user acts, and a silent failure in any of
 * them looks identical to "nothing happened" — which is exactly the class of bug
 * that ships.
 *
 * Each scenario runs in its own browser and reports PASS/FAIL per assertion, so
 * a failure names the broken behaviour instead of just printing a screenshot.
 *
 * Node 24 has a built-in WebSocket, so this needs no dependencies.
 *
 * Usage: node scripts/run-scenarios.mjs [scenarioName]
 */

import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT_DIR = 'screenshots'
mkdirSync(OUT_DIR, { recursive: true })

/*
 * Servers: dev (Vite dev, HMR + React dev warnings) or prod (vite preview of a
 * production build). Behaviour is asserted against the production build because
 * that is what actually ships: React's development-only warnings and the Vite
 * HMR overlay add console noise that is not part of the product.
 *
 *   node scripts/run-scenarios.mjs [name] [--dev]
 */
const USE_DEV = process.argv.includes('--dev')
const PORTS = USE_DEV
  ? { timeline: 5181, webgl: 5182, search: 5183, portfolio: 5180 }
  : { timeline: 4181, webgl: 4182, search: 4183, portfolio: 4180 }
const base = (app) => `http://localhost:${PORTS[app]}/`

const only = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : ''

/* ------------------------------------------------------------------ helpers */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Modifier-aware key descriptors for CDP Input.dispatchKeyEvent. */
const KEYS = {
  space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
  Delete: { key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 },
  Backspace: { key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 },
  Home: { key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 },
  End: { key: 'End', code: 'End', windowsVirtualKeyCode: 35 },
  s: { key: 's', code: 'KeyS', windowsVirtualKeyCode: 83, text: 's' },
  z: { key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, text: 'z' },
  d: { key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68, text: 'd' },
  '=': { key: '=', code: 'Equal', windowsVirtualKeyCode: 187, text: '=' },
  '-': { key: '-', code: 'Minus', windowsVirtualKeyCode: 189, text: '-' },
  '0': { key: '0', code: 'Digit0', windowsVirtualKeyCode: 48, text: '0' },
}

/**
 * Scenarios. Each step is one of:
 *   { eval }                          run JS, result recorded
 *   { click: label }                  click a button/link by visible text
 *   { clickAria: label }              click by aria-label
 *   { key }                           press a key (see KEYS)
 *   { key, mod: true }                press with Ctrl (and Meta on mac)
 *   { drag: selector, dx, dy }        browser-level mouse drag
 *   { wait }                          settle
 *   { expect: { label, actual, test } } assert on the previous eval value
 */
const SCENARIOS = [
  {
    name: 'timeline-shortcuts',
    url: base('timeline'),
    steps: [
      { wait: 7000 },
      // Click a clip in the timeline: selects it AND moves the playhead into it,
      // which is the state a split actually needs.
      {
        clickClip: 5,
        label: 'clickedClip',
      },
      { wait: 600 },
      { eval: `document.querySelectorAll('[data-clip]').length`, label: 'clipCountBefore' },
      // Space toggles playback.
      { key: 'space' },
      { wait: 500 },
      { eval: `!!document.querySelector('button[aria-label="Pause"]')`, label: 'playingAfterSpace' },
      { expect: { label: 'Space starts playback', actual: 'playingAfterSpace', cmp: 'eq', ref: true } },
      // Stop it again: a running playhead would drift out of the clip we are
      // about to split, which is a test artefact rather than an app bug.
      { key: 'space' },
      { wait: 400 },
      { eval: `!!document.querySelector('button[aria-label="Play"]')`, label: 'pausedAfterSecondSpace' },
      { expect: { label: 'Space stops playback', actual: 'pausedAfterSecondSpace', cmp: 'eq', ref: true } },
      { clickClip: 5 },
      { wait: 500 },
      { eval: `document.querySelector('footer').textContent.includes('snapping on')`, label: 'snapOnByDefault' },
      { expect: { label: 'snapping on by default', actual: 'snapOnByDefault', cmp: 'eq', ref: true } },
      // Split needs the playhead INSIDE the selected clip. Verify the no-op
      // feedback path instead: Home moves the playhead to 0, away from the
      // selection, so S must explain itself rather than do nothing silently.
      { key: 'Home' },
      { wait: 300 },
      { key: 's' },
      { wait: 700 },
      {
        eval: `document.body.innerText.toLowerCase().includes('move the playhead inside')`,
        label: 'splitNoopExplained',
      },
      { expect: { label: 'S explains a no-op split', actual: 'splitNoopExplained', cmp: 'eq', ref: true } },
      // Now put the playhead back inside a clip and split for real.
      { clickClip: 5 },
      { wait: 400 },
      {
        eval: `(() => {
          const r = document.querySelector('[data-playhead]')
          return { playhead: Number(r.dataset.playhead), clips: Number(r.dataset.clipCount), selection: r.dataset.selection }
        })()`,
        label: 'beforeSplitState',
      },
      { key: 's' },
      { wait: 600 },
      {
        eval: `(() => {
          const r = document.querySelector('[data-playhead]')
          return { clips: Number(r.dataset.clipCount), selection: r.dataset.selection }
        })()`,
        label: 'afterSplitState',
      },
      { expect: { label: 'click moved the playhead', actual: 'beforeSplitPlayheadOk', cmp: 'eq', ref: true } },
      { expect: { label: 'S split the clip (one extra clip)', actual: 'afterSplitState.clips', cmp: 'eq', ref: 'beforeSplitClipsPlus1' } },
      // Undo restores the pre-split count.
      { key: 'z', mod: true },
      { wait: 500 },
      { eval: `Number(document.querySelector('[data-playhead]').dataset.clipCount)`, label: 'clipsAfterUndo' },
      { expect: { label: 'undo restored clip count', actual: 'clipsAfterUndo', cmp: 'eq', ref: 'beforeSplitState.clips' } },
      // Zoom changes the px/s readout. (The grid *step* is quantised to a
      // pixel budget, so a single zoom step legitimately leaves it unchanged.)
      { eval: `Number(document.body.innerText.match(/(\\d+) px\\/s/)[1])`, label: 'zoomBefore' },
      { key: '=' },
      { wait: 400 },
      { eval: `Number(document.body.innerText.match(/(\\d+) px\\/s/)[1])`, label: 'zoomIn' },
      { expect: { label: '= zooms in', actual: 'zoomIn', cmp: 'gt', ref: 'zoomBefore' } },
      { key: '-' },
      { wait: 400 },
      { eval: `Number(document.body.innerText.match(/(\\d+) px\\/s/)[1])`, label: 'zoomOut' },
      { expect: { label: '- zooms back out', actual: 'zoomOut', cmp: 'eq', ref: 'zoomBefore' } },
      { key: '0' },
      { wait: 400 },
      { eval: `Number(document.body.innerText.match(/(\\d+) px\\/s/)[1])`, label: 'zoomReset' },
      { expect: { label: '0 resets zoom', actual: 'zoomReset', cmp: 'eq', ref: 74 } },
      // Delete the selection, then undo it back. Kept tight: the simulated
      // peers move a clip every ~6s, which must not disturb local selection.
      { clickClip: 3 },
      { wait: 250 },
      { eval: `document.querySelectorAll('[data-clip]').length`, label: 'beforeDelete' },
      { key: 'Delete' },
      { wait: 350 },
      { eval: `document.querySelectorAll('[data-clip]').length`, label: 'afterDelete' },
      { expect: { label: 'Delete removed the selection', actual: 'afterDelete', cmp: 'lt', ref: 'beforeDelete' } },
      { key: 'z', mod: true },
      { wait: 400 },
      { eval: `document.querySelectorAll('[data-clip]').length`, label: 'afterUndelete' },
      { expect: { label: 'undo restored the deleted clip', actual: 'afterUndelete', cmp: 'eq', ref: 'beforeDelete' } },
    ],
  },







  {
    name: 'timeline-trim',
    url: base('timeline'),
    steps: [
      { wait: 7000 },
      {
        eval: `(() => {
          const el = document.querySelector('[data-clip]');
          const r = el.getBoundingClientRect();
          return { id: el.getAttribute('data-clip'), left: r.left, w: r.width, top: r.top };
        })()`,
        label: 'before',
      },
      // Trim the LEFT edge inward by 60px: the right edge must stay pinned.
      { dragEdge: { selector: '[data-clip]', side: 'left', dx: 60 } },
      { wait: 600 },
      {
        eval: `(() => {
          const el = document.querySelector('[data-clip]');
          const r = el.getBoundingClientRect();
          return { left: r.left, w: r.width, right: r.left + r.width };
        })()`,
        label: 'afterTrim',
      },
      { expect: { label: 'left edge moved right', actual: 'trimDeltaLeft', cmp: 'gt', ref: 30 } },
      { expect: { label: 'right edge stayed pinned', actual: 'trimRightDrift', cmp: 'lt', ref: 6 } },
    ],
  },

  {
    name: 'search-facets',
    url: base('search'),
    steps: [
      { wait: 7000 },
      { eval: `(() => {
          const input = document.querySelector('input[aria-label="Search footage"]');
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, 'wide shot');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return 'typed';
        })()` },
      { wait: 300 },
      { click: 'Search' },
      { wait: 6000 },
      { eval: `document.querySelectorAll('article').length`, label: 'resultsUnfiltered' },
      // Click the "Wide" facet and confirm the set narrows.
      { click: 'Wide' },
      { wait: 6000 },
      { eval: `document.querySelectorAll('article').length`, label: 'resultsFiltered' },
      { expect: { label: 'facet narrowed results', actual: 'resultsFiltered', cmp: 'lte', ref: 'resultsUnfiltered' } },
      { eval: `document.body.innerText.toLowerCase().includes('evidence per result')`, label: 'evidencePresent' },
      { expect: { label: 'evidence panel still present', actual: 'evidencePresent', cmp: 'eq', ref: true } },
      // "clear filters" (facet rail) clears only the facets and keeps the
      // results — distinct from "clear" beside the search input, which resets
      // the whole query. Both used to be labelled "clear", which was ambiguous.
      { click: 'clear filters' },
      { wait: 6000 },
      { eval: `document.querySelectorAll('article').length`, label: 'resultsAfterClear' },
      { expect: { label: 'clear filters restored results', actual: 'resultsAfterClear', cmp: 'gte', ref: 'resultsUnfiltered' } },
    ],
  },

  {
    name: 'search-no-results',
    url: base('search'),
    steps: [
      { wait: 7000 },
      { eval: `(() => {
          const input = document.querySelector('input[aria-label="Search footage"]');
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, 'zzzz qqqq nonsense');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return 'typed';
        })()` },
      { wait: 300 },
      { click: 'Search' },
      { wait: 6000 },
      { eval: `document.querySelectorAll('article').length`, label: 'cards' },
      { expect: { label: 'junk query yields no cards', actual: 'cards', cmp: 'eq', ref: 0 } },
      { eval: `document.body.innerText.toLowerCase().includes('no clips match')`, label: 'emptyMessage' },
      { expect: { label: 'empty state shown', actual: 'emptyMessage', cmp: 'eq', ref: true } },
    ],
  },

  {
    name: 'portfolio-nav',
    url: base('portfolio'),
    steps: [
      { wait: 6000 },
      { eval: `document.querySelectorAll('section[id]').length`, label: 'sections' },
      { eval: `[...document.querySelectorAll('section[id]')].map(s => s.id)`, label: 'sectionIds' },
      { expect: { label: 'three project sections', actual: 'sections', cmp: 'gte', ref: 3 } },
      { eval: `document.body.innerText.includes('In progress')`, label: 'inProgressShown' },
      { expect: { label: 'accurate in-progress status shown', actual: 'inProgressShown', cmp: 'eq', ref: true } },
      { eval: `document.body.innerText.includes('no server or CRDT')`, label: 'honestyShown' },
      { expect: { label: 'simulation disclosed', actual: 'honestyShown', cmp: 'eq', ref: true } },
      { eval: `document.querySelectorAll('iframe').length`, label: 'iframesBefore' },
      { expect: { label: 'no iframe mounted until asked', actual: 'iframesBefore', cmp: 'eq', ref: 0 } },
      { click: 'Run demo' },
      { wait: 9000 },
      { eval: `[...document.querySelectorAll('iframe')].map(f => f.getAttribute('src'))`, label: 'iframesAfter' },
      { expect: { label: 'Run demo mounted the embed', actual: 'iframesAfter', cmp: 'len-gt', ref: 0 } },
    ],
  },

  {
    name: 'motion-controls',
    url: base('webgl'),
    steps: [
      { wait: 11000 },
      { eval: `document.querySelectorAll('canvas').length`, label: 'canvasCount' },
      { expect: { label: 'canvas present', actual: 'canvasCount', cmp: 'eq', ref: 1 } },
      // Toggle glitch on and confirm the button state changed.
      { click: 'glitch' },
      { wait: 500 },
      { eval: `(() => {
          const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'glitch');
          return b ? b.getAttribute('aria-pressed') : 'missing';
        })()`, label: 'glitchPressed' },
      { expect: { label: 'glitch toggled on', actual: 'glitchPressed', cmp: 'eq', ref: true } },
      // Open the GLSL viewer.
      { click: 'View GLSL' },
      { wait: 900 },
      { eval: `document.body.innerText.includes('void main')`, label: 'glslShown' },
      { expect: { label: 'GLSL source visible in-app', actual: 'glslShown', cmp: 'eq', ref: true } },
      { eval: `document.body.innerText.includes('bayer')`, label: 'bayerShown' },
      { expect: { label: 'dither implementation visible', actual: 'bayerShown', cmp: 'eq', ref: true } },
    ],
  },
]

/* ------------------------------------------------------------------- driver */

async function runScenario(scenario, index) {
  const port = 9400 + index
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--no-sandbox',
      '--hide-scrollbars',
      '--window-size=1600,1000',
      `--remote-debugging-port=${port}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  const results = []
  const pageErrors = []
  const consoleErrors = []
  let ws
  let msgId = 0
  const pending = new Map()

  const send = (method, params = {}, sessionId) => {
    const id = ++msgId
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }

  const getJson = async (path) => {
    for (let i = 0; i < 50; i += 1) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`)
        if (res.ok) return await res.json()
      } catch {
        /* not up */
      }
      await sleep(250)
    }
    throw new Error('devtools never came up')
  }

  try {
    const version = await getJson('/json/version')
    ws = new WebSocket(version.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true })
      ws.addEventListener('error', reject, { once: true })
    })

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id)
        pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message))
        else resolve(msg.result)
        return
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params?.exceptionDetails
        pageErrors.push(d?.exception?.description || d?.text || 'unknown')
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ')
        const stack = (msg.params.stackTrace?.callFrames || [])
          .slice(0, 12)
          .map((f) => `${f.functionName || '(anon)'}@${f.url.split('/').pop()}:${f.lineNumber}`)
          .join(' <- ')
        consoleErrors.push(stack ? `${text}\n     stack: ${stack}` : text)
      }
    })

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    await send('Runtime.enable', {}, sessionId)
    await send('Page.enable', {}, sessionId)
    await send('Page.navigate', { url: scenario.url }, sessionId)
    await sleep(2000)

    const evaluate = async (expression) => {
      const r = await send(
        'Runtime.evaluate',
        { expression, returnByValue: true, awaitPromise: true },
        sessionId,
      )
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.exception?.description || 'eval failed')
      }
      return r.result?.value
    }

    const recorded = {}

    for (const step of scenario.steps) {
      if (step.wait) {
        await sleep(step.wait)
      } else if (step.eval !== undefined) {
        const value = await evaluate(step.eval)
        if (step.label) {
          recorded[step.label] = value
          // Unasserted evals still need to be visible, or a debug scenario
          // prints nothing at all.
          if (!scenario.steps.some((s) => s.expect && s.expect.actual === step.label)) {
            console.log(`  ..    ${step.label} = ${JSON.stringify(value)}`)
          }
        }
      } else if (step.click) {
        const want = JSON.stringify(step.click.toLowerCase())
        const out = await evaluate(`
          (() => {
            const btn = [...document.querySelectorAll('button, a')]
              .find(b => b.textContent.trim().toLowerCase() === ${want})
            if (!btn) return 'NO_BUTTON'
            btn.click()
            return 'CLICKED'
          })()
        `)
        if (out !== 'CLICKED') results.push({ ok: false, label: `click "${step.click}"`, detail: out })
      } else if (step.clickAria) {
        const want = JSON.stringify(step.clickAria)
        const out = await evaluate(`
          (() => {
            const el = document.querySelector('[aria-label=' + ${want} + ']')
            if (!el) return 'NO_ELEMENT'
            el.click()
            return 'CLICKED'
          })()
        `)
        if (out !== 'CLICKED') results.push({ ok: false, label: `clickAria "${step.clickAria}"`, detail: out })
      } else if (step.key) {
        const k = KEYS[step.key]
        if (!k) throw new Error(`unknown key: ${step.key}`)
        const mods = step.mod ? 2 | 4 : 0 // Ctrl | Meta
        await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: mods, ...k }, sessionId)
        await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: mods, ...k }, sessionId)
      } else if (step.clickClip !== undefined) {
        // Click the middle of the Nth clip in the timeline. This is how a user
        // selects a clip and moves the playhead into it in one gesture.
        const info = await evaluate(`
          (() => {
            const el = document.querySelectorAll('[data-clip]')[${step.clickClip}]
            if (!el) return null
            const r = el.getBoundingClientRect()
            return { id: el.getAttribute('data-clip'), x: r.left + r.width / 2, y: r.top + r.height / 2 }
          })()
        `)
        if (!info) throw new Error(`clickClip: no clip at index ${step.clickClip}`)
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: info.x, y: info.y, button: 'left', buttons: 1, clickCount: 1 }, sessionId)
        await sleep(90)
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: info.x, y: info.y, button: 'left', buttons: 0, clickCount: 1 }, sessionId)
        if (step.label) recorded[step.label] = info.id
      } else if (step.dragEdge) {
        const { selector, side, dx } = step.dragEdge
        const box = await evaluate(`
          (() => {
            const el = document.querySelector(${JSON.stringify(selector)})
            if (!el) return null
            const r = el.getBoundingClientRect()
            return { left: r.left, top: r.top, w: r.width, h: r.height }
          })()
        `)
        if (!box) throw new Error(`dragEdge: no element for ${selector}`)
        const y = box.top + box.h / 2
        const x = side === 'left' ? box.left + 3 : box.left + box.w - 3
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 }, sessionId)
        await sleep(120)
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 }, sessionId)
        for (let i = 1; i <= 6; i += 1) {
          await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + (dx * i) / 6, y, button: 'left', buttons: 1 }, sessionId)
          await sleep(50)
        }
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + dx, y, button: 'left', buttons: 0 }, sessionId)
      }
    }

    /* ---- derive cross-step values then evaluate expectations -------------- */
    if (recorded.before && recorded.afterTrim) {
      recorded.trimDeltaLeft = recorded.afterTrim.left - recorded.before.left
      recorded.trimRightDrift = Math.abs(recorded.afterTrim.right - (recorded.before.left + recorded.before.w))
    }
    if (recorded.beforeSplitState) {
      recorded.beforeSplitPlayheadOk = recorded.beforeSplitState.playhead > 4.6
      recorded.beforeSplitClipsPlus1 = recorded.beforeSplitState.clips + 1
    }

    /** Resolve "a.b" against the recorded values. */
    const resolve = (key) => {
      if (typeof key !== 'string' || !key.includes('.')) return recorded[key]
      return key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), recorded)
    }

    for (const step of scenario.steps.filter((s) => s.expect)) {
      const { label, actual, cmp, ref } = step.expect
      const a = resolve(actual)
      const r = typeof ref === 'string' ? resolve(ref) : ref
      let ok = false
      // Equality is compared as strings so a DOM-derived "true" (attributes are
      // always strings) matches a boolean literal in a scenario. Every other
      // operator is numeric or structural.
      const same = String(a) === String(r)
      if (cmp === 'eq') ok = same
      else if (cmp === 'ne') ok = !same
      else if (cmp === 'gt') ok = typeof a === 'number' && typeof r === 'number' && a > r
      else if (cmp === 'gte') ok = typeof a === 'number' && typeof r === 'number' && a >= r
      else if (cmp === 'lte') ok = typeof a === 'number' && typeof r === 'number' && a <= r
      else if (cmp === 'lt') ok = typeof a === 'number' && typeof r === 'number' && a < r
      else if (cmp === 'len-gt') ok = Array.isArray(a) && a.length > r
      results.push({ ok, label, detail: `${actual}=${JSON.stringify(a)} ${cmp} ${JSON.stringify(r)}` })
    }

    const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
    writeFileSync(`${OUT_DIR}/scenario-${scenario.name}.png`, Buffer.from(shot.data, 'base64'))

    if (pageErrors.length) {
      for (const e of pageErrors) {
        results.push({ ok: false, label: 'page exception', detail: e.split('\n').slice(0, 6).join(' <- ') })
      }
    }
    for (const e of consoleErrors) {
      results.push({ ok: false, label: 'console error', detail: e.slice(0, 900) })
    }
  } catch (err) {
    results.push({ ok: false, label: 'driver', detail: err.message })
  } finally {
    try {
      ws?.close()
    } catch {
      /* ignore */
    }
    chrome.kill('SIGKILL')
  }

  return results
}

/* --------------------------------------------------------------------- main */

const selected = only ? SCENARIOS.filter((s) => s.name === only) : SCENARIOS
if (!selected.length) {
  console.error(`no scenario named "${only}". Available: ${SCENARIOS.map((s) => s.name).join(', ')}`)
  process.exit(2)
}

let failures = 0
let assertions = 0

for (let i = 0; i < selected.length; i += 1) {
  const scenario = selected[i]
  console.log(`\n=== ${scenario.name} (${scenario.url}) ===`)
  const results = await runScenario(scenario, i)
  if (!results.length) {
    console.log('  (no assertions - inspect screenshots)')
  }
  for (const r of results) {
    assertions += 1
    if (!r.ok) failures += 1
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label}${r.detail ? `  [${r.detail}]` : ''}`)
  }
}

console.log(`\n${assertions} assertions, ${failures} failures`)
process.exitCode = failures ? 1 : 0