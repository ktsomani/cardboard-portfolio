import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../src/shaders/index.js'

/**
 * Standalone shader diagnostic harness.
 *
 * Renders the real ShaderMaterial in isolation so a blank canvas can be
 * attributed: is it the shader, the camera, or the scene? Reads back a centre
 * pixel so "it drew something" is proven rather than assumed.
 *
 * Open http://localhost:5182/shader-test.html
 */

const out = document.getElementById('out')
const lines = []
const log = (msg, cls) => {
  lines.push('<span class="' + (cls || '') + '">' + msg + '</span>')
  out.innerHTML = lines.join('<br>')
  // Also mirror as plain text so it can be read with --dump-dom.
  if (window.diag) window.diag(msg.replace(/<[^>]+>/g, ''))
}

window.diag && window.diag('module shader-test.js executing')

// The renderer reports shader compile failures through console.error.
const errors = []
const origError = console.error
console.error = (...a) => {
  errors.push(a.map(String).join(' '))
  origError.apply(console, a)
}

const view = document.getElementById('view')

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(view.clientWidth, view.clientHeight)
  view.appendChild(renderer.domElement)

  const gl = renderer.getContext()
  const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
  log('WebGL context: <b>' + (isGL2 ? 'webgl2' : 'webgl1') + '</b>', 'ok')
  log('outputColorSpace: ' + renderer.outputColorSpace)
  log('GL_VERSION: ' + gl.getParameter(gl.VERSION))
  log('GLSL: ' + gl.getParameter(gl.SHADING_LANGUAGE_VERSION))

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#06060a')
  const camera = new THREE.PerspectiveCamera(42, view.clientWidth / view.clientHeight, 0.1, 100)
  camera.position.set(3.1, 2.0, 3.6)
  camera.lookAt(0, 0, 0)

  const uniforms = {
    uTime: { value: 0 },
    uSpeed: { value: 1 },
    uAmplitude: { value: 0.24 },
    uFrequency: { value: 2.2 },
    uTwist: { value: 0.5 },
    uDither: { value: 1 },
    uGlitch: { value: 0 },
    uPosterize: { value: 0.45 },
    uScanline: { value: 0 },
    uLightness: { value: 0.02 },
    uHue: { value: 0.55 },
    uRoughness: { value: 0.35 },
    uAccentMix: { value: 0.78 },
    uAccent: { value: new THREE.Color('#ff5c38') },
    uFill: { value: new THREE.Color('#2b3b6b') },
  }

  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms })
  const geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8, 96, 96, 96)
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  log('geometry position count: ' + geometry.attributes.position.count)

  try {
    renderer.compile(scene, camera)
    log('renderer.compile() did not throw.', 'ok')
  } catch (e) {
    log('COMPILE THREW: ' + e.message, 'bad')
  }

  const programs = renderer.info.programs || []
  log('programs after compile: ' + programs.length)
  for (const p of programs) {
    const d = p.diagnostics
    log('  diagnostics: ' + (d ? JSON.stringify(d) : 'none'))
  }

  renderer.render(scene, camera)

  const px = new Uint8Array(4)
  const cx = Math.floor(renderer.domElement.width / 2)
  const cy = Math.floor(renderer.domElement.height / 2)
  gl.readPixels(cx, cy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
  const lit = px[0] + px[1] + px[2]
  log('centre pixel rgba: [' + px.join(', ') + ']', lit > 12 ? 'ok' : 'bad')

  if (errors.length) {
    log('--- console.error output ---', 'bad')
    for (const e of errors) log('<pre>' + e + '</pre>')
  } else {
    log('No console errors captured.', 'ok')
  }

  // Deliberately a *bounded* animation loop, not requestAnimationFrame forever:
  // an endless rAF keeps the page permanently busy, which prevents headless
  // Chrome's --virtual-time-budget from ever expiring and hangs --dump-dom.
  // 90 frames is enough to prove the shader animates without blocking automation.
  let t = 0
  let frame = 0
  const tick = () => {
    t += 0.016
    uniforms.uTime.value = t
    mesh.rotation.y = t * 0.22
    renderer.render(scene, camera)
    frame += 1
    if (frame < 90) {
      requestAnimationFrame(tick)
    } else {
      log('animated 90 frames without error.', 'ok')
      document.title = 'DIAG-DONE'
    }
  }
  tick()
} catch (e) {
  log('FATAL: ' + e.message, 'bad')
  log('<pre>' + e.stack + '</pre>')
}
