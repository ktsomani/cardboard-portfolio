/**
 * Probes a live URL for opacity/visibility problems and console errors.
 *
 * Motivation: the portfolio's entrance animations start at `opacity: 0` and
 * animate to 1. If those animations never run — for any reason — the content
 * exists in the DOM but is invisible, which is a catastrophic failure mode for
 * a portfolio whose entire job is to be read.
 *
 * Usage: node scripts/probe-live.mjs <url>
 */

import { spawn } from 'node:child_process'

const url = process.argv[2]
if (!url) {
  console.error('usage: node scripts/probe-live.mjs <url>')
  process.exit(2)
}

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9455
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--window-size=1600,1000',
    `--remote-debugging-port=${PORT}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

let ws
let msgId = 0
const pending = new Map()
const consoleErrors = []
const pageErrors = []

try {
  let version
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) {
        version = await res.json()
        break
      }
    } catch {
      /* not up */
    }
    await sleep(250)
  }
  if (!version) throw new Error('devtools never came up')

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
      pageErrors.push(msg.params?.exceptionDetails?.exception?.description || 'exception')
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
      consoleErrors.push((msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '))
    }
  })

  const send = (method, params = {}, sessionId) => {
    const id = ++msgId
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  await send('Runtime.enable', {}, sessionId)
  await send('Page.enable', {}, sessionId)
  await send('Page.navigate', { url }, sessionId)

  await sleep(12000)

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true }, sessionId)
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed')
    return r.result?.value
  }

  const report = await evaluate(`
    (() => {
      const out = { invisible: [], visible: 0, errors: [] }
      const els = document.querySelectorAll('body *')
      let checked = 0
      for (const el of els) {
        const text = (el.innerText || '').trim()
        if (!text || text.length < 12) continue
        // only leaf-ish nodes, to avoid double counting containers
        if (el.querySelector('*') && (el.innerText || '').trim().length < 12) continue
        const cs = getComputedStyle(el)
        const op = parseFloat(cs.opacity)
        const vis = cs.visibility
        const disp = cs.display
        checked++
        if (op < 0.15 || vis === 'hidden' || disp === 'none') {
          out.invisible.push({
            tag: el.tagName,
            op,
            vis,
            disp,
            transform: cs.transform,
            text: text.slice(0, 60),
          })
        } else {
          out.visible++
        }
      }
      out.checked = checked
      return out
    })()
  `)

  console.log('URL:', url)
  console.log('elements checked :', report.checked)
  console.log('visible          :', report.visible)
  console.log('INVISIBLE        :', report.invisible.length)
  console.log('')
  for (const el of report.invisible.slice(0, 14)) {
    console.log(`  ${el.tag}  opacity=${el.op}  visibility=${el.vis}  display=${el.disp}`)
    console.log(`     "${el.text}"`)
  }
  console.log('')
  console.log('page exceptions  :', pageErrors.length)
  for (const e of pageErrors.slice(0, 4)) console.log('  !', e.split('\n')[0])
  console.log('console errors   :', consoleErrors.length)
  for (const e of consoleErrors.slice(0, 5)) console.log('  !', e.slice(0, 200))
} catch (err) {
  console.error('PROBE ERROR:', err.message)
  process.exitCode = 2
} finally {
  try {
    ws?.close()
  } catch {
    /* ignore */
  }
  chrome.kill('SIGKILL')
}
