/**
 * Small typed-ish helpers. Kept dependency-free and pure so the timeline math
 * can be reasoned about (and unit-tested) independently of React.
 */

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** Snap a value to the nearest multiple of `step`. */
export const snapTo = (v, step) => Math.round(v / step) * step

export const round = (v, dp = 2) => Number(v.toFixed(dp))

/** Avoids float drift when nudging times (0.1 + 0.2 problems). */
export const fixFloat = (v) => Math.round(v * 1000) / 1000

/** 12.48 -> "00:12.48" (mm:ss.ff style, at 2 decimals) */
export function formatTime(seconds) {
  const s = Math.max(0, seconds)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(Math.floor(s % 60)).padStart(2, '0')
  const cs = String(Math.floor((s % 1) * 100)).padStart(2, '0')
  return `${mm}:${ss}.${cs}`
}

/** 12.48 -> "12.48s" for compact inspector readouts */
export const formatSeconds = (seconds) => `${round(seconds, 2).toFixed(2)}s`

export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}`

/**
 * Deterministic pseudo-random in [0,1) from an integer seed.
 * Used for waveform bars + clip thumbnails so visuals never flicker on re-render.
 */
export function seededRandom(seed) {
  let t = seed + 0x6d2b79f5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Stable seed from a string id, so a clip's look sticks to the clip. */
export function hashSeed(str = '') {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Critically-damped-ish approach, frame-rate independent. */
export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

export const lerp = (a, b, t) => a + (b - a) * t
