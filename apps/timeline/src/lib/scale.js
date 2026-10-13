/**
 * Zoom-aware scale decisions.
 *
 * A timeline has to answer "what is the smallest unit worth drawing?" at every
 * zoom level. Deriving that from a pixel budget (rather than hard-coding steps)
 * is what keeps the ruler and grid legible from 18px/s to 260px/s.
 */

/** Smallest step whose on-screen spacing clears `minPx`. */
export function chooseStep(pxPerSec, candidates, minPx) {
  for (const step of candidates) {
    if (step * pxPerSec >= minPx) return step
  }
  return candidates[candidates.length - 1]
}

export const MINOR_STEPS = [0.25, 0.5, 1, 2, 4, 8, 16]
export const LABEL_STEPS = [0.5, 1, 2, 5, 10, 15, 30]

/** Grid lines: never denser than ~9px or it reads as noise. */
export const gridStep = (pxPerSec) => chooseStep(pxPerSec, MINOR_STEPS, 9)

/** Ruler labels: ~64px between timecodes keeps them from colliding. */
export const labelStep = (pxPerSec) => chooseStep(pxPerSec, LABEL_STEPS, 64)

/** Ticks between labels: 4 subdivisions reads as a film ruler. */
export const tickDivisions = 4

export function labelForTime(seconds, step) {
  if (step < 1) return `${seconds.toFixed(1)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}s`
  return `${m}:${String(s).padStart(2, '0')}`
}
