/**
 * Screenshot a URL using wall-clock waiting rather than Chrome's virtual time.
 *
 * Why this exists: under `--virtual-time-budget`, headless Chrome fast-forwards
 * timers, which can leave CSS/JS animations that are driven by the compositor
 * stuck at their initial state. A screenshot then shows `opacity: 0` content as
 * blank even though the DOM is correct and a real browser renders it fine.
 *
 * This drives Chrome over CDP and waits in real time, which matches what a
 * visitor actually experiences.
 *
 * Usage: node scripts/screenshot-live.mjs <url> <out.png> [waitMs] [height]
 */

import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const url = process.argv[2]
const out = process.argv[3]
const waitMs = Number(process.argv[4] || 9000)
const height = Number(process.argv[5] || 1150)

if (!url || !out) {
  console.error('usage: node scripts/screenshot-live.mjs <url> <out.png> [waitMs] [height]')
  process.exit(2)
}
mkdirSync('screenshots', { recursive: true })

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9466
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--hide-scrollbars',
    '--no-sandbox',
    `--window-size=1600,${height}`,
    `--remote-debugging-port=${PORT}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

let ws
let msgId = 0
const pending = new Map()

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
  await send('Page.enable', {}, sessionId)
  await send('Runtime.enable', {}, sessionId)
  await send('Page.navigate', { url }, sessionId)

  // Real wall-clock wait: no virtual time, so animations run normally.
  await sleep(waitMs)

  const probe = await send(
    'Runtime.evaluate',
    {
      expression: `(() => {
        const h = document.querySelector('h1')
        const cs = h ? getComputedStyle(h) : null
        return {
          h1: h ? h.innerText.slice(0, 60) : null,
          h1opacity: cs ? cs.opacity : null,
          bodyText: document.body.innerText.slice(0, 120).replace(/\\n+/g, ' | '),
        }
      })()`,
      returnByValue: true,
    },
    sessionId,
  )
  console.log('h1:', JSON.stringify(probe.result?.value?.h1))
  console.log('h1 opacity:', probe.result?.value?.h1opacity)
  console.log('body head:', probe.result?.value?.bodyText)

  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
  writeFileSync(out, Buffer.from(shot.data, 'base64'))
  console.log('written:', out)
} catch (err) {
  console.error('ERROR:', err.message)
  process.exitCode = 2
} finally {
  try {
    ws?.close()
  } catch {
    /* ignore */
  }
  chrome.kill('SIGKILL')
}
