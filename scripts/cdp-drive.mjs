/**
 * Interactive verification via the Chrome DevTools Protocol.
 *
 * Load-state screenshots cannot reach code paths that only run after a user
 * acts — the search results grid, the context panel evidence, the 3D retrieval
 * view. Those render inside an error boundary, so a crash there would leave a
 * visible red panel that my static checks would miss entirely.
 *
 * This drives the real UI: types a query, submits it, waits for results, and
 * reports any page error. It also screenshots the result.
 *
 * Node 24 has a built-in WebSocket, so this needs no dependencies.
 *
 * Usage: node scripts/cdp-drive.mjs <url> <outPng> [query|-] [buttonText] [--drag-clip]
 */

const url = process.argv[2]
const outPng = process.argv[3]
const queryArg = process.argv[4]
const query = queryArg && queryArg !== '-' ? queryArg : ''
const clickArg = process.argv[5] || ''
const clickText = clickArg.startsWith('--') ? '' : clickArg
// --drag-clip exercises the timeline's pointer-drag path via real input events.
const dragClip = process.argv.includes('--drag-clip')
if (!url || !outPng) {
  console.error(
    'usage: node scripts/cdp-drive.mjs <url> <outPng> [query|-] [clickButtonText] [--drag-clip]',
  )
  process.exit(2)
}
let dragResult = null

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9333

import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

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
    `--remote-debugging-port=${PORT}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(path) {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}${path}`)
      if (res.ok) return await res.json()
    } catch {
      /* not up yet */
    }
    await sleep(250)
  }
  throw new Error(`devtools endpoint never came up: ${path}`)
}

let ws
let msgId = 0
const pending = new Map()
const pageErrors = []
const consoleErrors = []

function send(method, params = {}, sessionId) {
  const id = ++msgId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params, sessionId }))
  })
}

try {
  const version = await getJson('/json/version')
  console.log('browser:', version.Browser)

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
    // Page-level errors are the whole point: surface them.
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params?.exceptionDetails
      pageErrors.push(d?.exception?.description || d?.text || 'unknown exception')
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
      consoleErrors.push(
        (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '),
      )
    }
  })

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })

  await send('Runtime.enable', {}, sessionId)
  await send('Page.enable', {}, sessionId)

  await send('Page.navigate', { url }, sessionId)
  // Let the module graph (1000+ modules for the Three apps) load over HTTP.
  await sleep(9000)

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

  if (query) {
    // Drive the real input the way a user would, so React's onChange fires.
    const typed = await evaluate(`
      (() => {
        const input = document.querySelector('input[aria-label="Search footage"]')
        if (!input) return 'NO_INPUT'
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        setter.call(input, ${JSON.stringify(query)})
        input.dispatchEvent(new Event('input', { bubbles: true }))
        return 'TYPED'
      })()
    `)
    console.log('type query:', typed)

    if (typed === 'TYPED') {
      await sleep(400)
      const clicked = await evaluate(`
        (() => {
          const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Search')
          if (!btn) return 'NO_BUTTON'
          btn.click()
          return 'CLICKED'
        })()
      `)
      console.log('submit:', clicked)
      // The pipeline is staged: ~2s of choreography, then the payload lands.
      await sleep(6500)
    }
  }

  /* ---- timeline: drag a clip and measure whether it actually moved -------- */
  if (dragClip) {
    const before = await evaluate(`
      (() => {
        const el = document.querySelector('[data-clip]')
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { id: el.getAttribute('data-clip'), left: r.left, top: r.top, w: r.width }
      })()
    `)
    console.log('clip before:', JSON.stringify(before))

    if (before) {
      const cx = before.left + before.w / 2
      const cy = before.top + 20
      // A real press / move / release sequence through CDP input events, so
      // pointer capture and the drag reducer are exercised for real.
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1, buttons: 1 }, sessionId)
      for (let i = 1; i <= 8; i += 1) {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + i * 25, y: cy, button: 'left', buttons: 1 }, sessionId)
        await sleep(45)
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 200, y: cy, button: 'left', buttons: 0 }, sessionId)
      await sleep(700)

      const after = await evaluate(`
        (() => {
          const el = document.querySelector('[data-clip="${before.id}"]')
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { left: r.left, top: r.top, undoEnabled: !document.querySelector('button[aria-label="Undo"]')?.disabled }
        })()
      `)
      const moved = after ? after.left - before.left : 0
      console.log('clip after :', JSON.stringify(after))
      console.log(`DRAG DELTA: ${moved.toFixed(1)}px  (expected ~200)`)
      dragResult = { moved, undoEnabled: after?.undoEnabled }
    } else {
      console.log('DRAG: no [data-clip] element found')
      dragResult = { moved: 0, undoEnabled: false }
    }
  }

  if (clickText) {
    // Click a button by its visible label. Case-insensitive, because several
    // labels are styled with Tailwind's `capitalize` and so differ from the DOM text.
    const clicked = await evaluate(`
      (() => {
        const want = ${JSON.stringify(clickText)}.toLowerCase()
        const btn = [...document.querySelectorAll('button, a')]
          .find(b => b.textContent.trim().toLowerCase() === want)
        if (!btn) {
          return 'NO_BUTTON:' + [...document.querySelectorAll('button')]
            .map(b => b.textContent.trim()).filter(Boolean).slice(0, 24).join('|')
        }
        btn.click()
        return 'CLICKED'
      })()
    `)
    console.log(`click "${clickText}":`, clicked)
    // Give an embedded app or a WebGL surface time to boot AND for the 3D
    // node layout to finish easing into place before the screenshot.
    await sleep(14000)
  }

  /* ---- assertions about the rendered result ------------------------------- */
  // NB: compare case-insensitively. Section headings are styled with Tailwind's
  // `uppercase`, so innerText returns "EVIDENCE PER RESULT", not the JSX casing.
  const probe = await evaluate(`
    (() => {
      const text = document.body.innerText
      const lower = text.toLowerCase()
      const cards = document.querySelectorAll('article').length
      const boundary = lower.includes('this demo hit a render error')
      const noResults = lower.includes('no clips match this query')
      return {
        boundary,
        noResults,
        cards,
        hasEvidence: lower.includes('evidence per result'),
        hasQueryAnalysis: lower.includes('query analysis'),
        hasSequence: lower.includes('proposed sequence'),
        mentionsLocal: lower.includes('scored locally'),
        resultCountText: (text.match(/\\d+ results/) || ['none'])[0],
        iframes: [...document.querySelectorAll('iframe')].map(f => f.getAttribute('src')),
        hasCanvas: document.querySelectorAll('canvas').length,
      }
    })()
  `)

  console.log('probe:', JSON.stringify(probe, null, 2))

  const shot = await send(
    'Page.captureScreenshot',
    { format: 'png', captureBeyondViewport: false },
    sessionId,
  )
  writeFileSync(outPng, Buffer.from(shot.data, 'base64'))
  console.log('screenshot written:', outPng)

  if (pageErrors.length) {
    console.log('\nPAGE EXCEPTIONS:')
    for (const e of pageErrors) console.log('  !', e.split('\n')[0])
  } else {
    console.log('\nno page exceptions')
  }
  if (consoleErrors.length) {
    console.log('CONSOLE ERRORS:')
    for (const e of consoleErrors) console.log('  !', e.slice(0, 300))
  }

  const bad =
    pageErrors.length > 0 ||
    consoleErrors.length > 0 ||
    probe.boundary === true ||
    (query && probe.hasEvidence === false) ||
    // A drag that moved the clip less than half the requested distance means
    // the pointer path is broken, even though nothing threw.
    (dragResult !== null && dragResult.moved < 100)

  console.log('\nRESULT:', bad ? 'PROBLEMS FOUND' : 'CLEAN')
  process.exitCode = bad ? 1 : 0
} catch (err) {
  console.error('DRIVER ERROR:', err.message)
  process.exitCode = 2
} finally {
  try {
    ws?.close()
  } catch {
    /* ignore */
  }
  chrome.kill('SIGKILL')
}
