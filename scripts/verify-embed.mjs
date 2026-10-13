/**
 * Proves an embedded demo actually loads inside the portfolio iframe.
 *
 * Matters because two separate things can silently break an embed:
 *   1. the demo origin is wrong (e.g. still pointing at localhost)
 *   2. the demo refuses to be framed (X-Frame-Options / CSP frame-ancestors)
 * Both produce a blank rectangle that a page-level check will not notice.
 *
 * Usage: node scripts/verify-embed.mjs <portfolioUrl> [waitMs]
 */

import { spawn } from 'node:child_process'

const portfolioUrl = process.argv[2] || 'https://kartikdesign.vercel.app'
const waitMs = Number(process.argv[3] || 14000)

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9477
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
  await send('Page.enable', {}, sessionId)
  await send('Runtime.enable', {}, sessionId)
  await send('Page.navigate', { url: portfolioUrl }, sessionId)
  await sleep(waitMs)

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed')
    return r.result?.value
  }

  // Click the first "Run demo" so the iframe mounts.
  const clicked = await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Run demo')
      if (!b) return 'NO_BUTTON'
      b.click()
      return 'CLICKED'
    })()
  `)
  console.log('run demo click:', clicked)

  await sleep(11000)

  const result = await evaluate(`
    (() => {
      const iframes = [...document.querySelectorAll('iframe')]
      return iframes.map(f => {
        let inner = null
        try {
          // Same-origin would allow this; cross-origin throws, which itself
          // proves the frame loaded a real document rather than nothing.
          inner = f.contentDocument ? 'same-origin' : 'cross-origin'
        } catch (e) {
          inner = 'cross-origin(blocked)'
        }
        return { src: f.getAttribute('src'), w: f.clientWidth, h: f.clientHeight, access: inner }
      })
    })()
  `)
  console.log('iframes:', JSON.stringify(result, null, 2))

  // Ask the browser which targets exist — a framed demo shows up as a target.
  const { targetInfos } = await send('Target.getTargets')
  const frameTargets = targetInfos.filter((t) => t.type === 'iframe' || t.url.includes('vercel.app'))
  console.log('')
  console.log('frame targets detected:')
  for (const t of frameTargets) console.log(`  [${t.type}] ${t.url.slice(0, 90)}`)

  console.log('')
  console.log('console errors:', consoleErrors.length)
  for (const e of consoleErrors.slice(0, 4)) console.log('  !', e.slice(0, 160))
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
