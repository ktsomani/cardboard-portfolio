// Sanity-checks the shader module: exports exist, strings are non-trivial, and
// the GLSL has balanced braces. A GLSL compile error would not fail the JS
// build, so this is the cheapest available guard against shipping a blank canvas.
//
// It also guards the source file against stray backticks inside the template
// literals: those terminate the string early, turning GLSL into JavaScript and
// producing "Unexpected identifier" at load time. That bug has happened once.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fragmentShader, vertexShader } from '../apps/webgl/src/shaders/index.js'

let fail = 0

/* ---- source-level guard: backtick count must be exactly the delimiters ---- */
{
  const here = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(join(here, '../apps/webgl/src/shaders/index.js'), 'utf8')
  const ticks = (src.match(/`/g) ?? []).length
  const declarations = (src.match(/export const \w+ = \/\* glsl \*\/ `/g) ?? []).length
  // One opening + one closing per template literal, and nothing else.
  if (ticks !== declarations * 2) {
    console.log(
      `FAIL shader source: found ${ticks} backticks for ${declarations} template literals ` +
        `(expected ${declarations * 2}) — a stray backtick inside a GLSL literal ` +
        `terminates the string early and breaks the module load`,
    )
    fail++
  } else {
    console.log(`ok   shader source: ${ticks} backticks = ${declarations} literals x 2 delimiters`)
  }
}
const check = (name, src, { requireMain = true } = {}) => {
  if (typeof src !== 'string' || src.length < 80) {
    console.log(`FAIL ${name}: missing or too short`)
    fail++
    return
  }
  const braces = (src.match(/{/g) ?? []).length - (src.match(/}/g) ?? []).length
  const parens = (src.match(/\(/g) ?? []).length - (src.match(/\)/g) ?? []).length
  if (braces !== 0) {
    console.log(`FAIL ${name}: unbalanced braces (${braces})`)
    fail++
  }
  if (parens !== 0) {
    console.log(`FAIL ${name}: unbalanced parens (${parens})`)
    fail++
  }
  if (requireMain && !/void\s+main\s*\(/.test(src)) {
    console.log(`FAIL ${name}: no void main()`)
    fail++
  }
  // GLSL ES 1.00 has no array constructors; guard against regressing into one.
  if (/float\s*\[\s*\d+\s*\]\s*\(/.test(src)) {
    console.log(`FAIL ${name}: uses a GLSL ES 3.00 array constructor`)
    fail++
  }
  console.log(`ok   ${name}: ${src.length} chars, braces balanced`)
}

check('vertexShader', vertexShader)
check('fragmentShader', fragmentShader)

// Uniforms declared in the fragment shader must be supplied by the material.
const declared = [...fragmentShader.matchAll(/uniform\s+\w+\s+(\w+)/g)].map((m) => m[1])
const supplied = [
  'uTime', 'uDither', 'uGlitch', 'uPosterize', 'uScanline', 'uLightness', 'uHue',
  'uRoughness', 'uAccentMix', 'uAccent', 'uFill',
]
const missing = declared.filter((d) => !supplied.includes(d))
if (missing.length) {
  console.log('FAIL fragment uniforms with no value supplied:', missing.join(', '))
  fail++
} else {
  console.log(`ok   fragment uniforms all supplied (${declared.length} declared)`)
}

const vDeclared = [...vertexShader.matchAll(/uniform\s+\w+\s+(\w+)/g)].map((m) => m[1])
const vSupplied = ['uTime', 'uSpeed', 'uAmplitude', 'uFrequency', 'uTwist']
const vMissing = vDeclared.filter((d) => !vSupplied.includes(d))
if (vMissing.length) {
  console.log('FAIL vertex uniforms with no value supplied:', vMissing.join(', '))
  fail++
} else {
  console.log(`ok   vertex uniforms all supplied (${vDeclared.length} declared)`)
}

console.log('\nFAILURES:', fail)
process.exitCode = fail ? 1 : 0
