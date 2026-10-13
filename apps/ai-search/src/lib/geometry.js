/**
 * Small geometry/utility helpers shared by the visual components.
 * Deterministic randomness matters here: thumbnails and glows must look
 * identical on every render, or the grid visibly flickers.
 */

/** Stable numeric seed from a string id. */
export function hashSeed(str = '') {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministic pseudo-random in [0, 1) from an integer seed. */
export function seededRandom(seed) {
  let t = seed + 0x6d2b79f5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
