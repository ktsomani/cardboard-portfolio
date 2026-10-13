/**
 * The snapping engine.
 *
 * Design notes (this is the part of a timeline people judge):
 *  - Candidates are gathered in *pixel* space because our tolerance is a
 *    visual one: "within 8px of one another should feel like touching".
 *    A fixed tolerance in seconds would feel sticky when zoomed out and
 *    useless when zoomed in.
 *  - When moving a whole clip we offer the engine both edges (and the clip
 *    centre), then pick the candidate that requires the smallest correction.
 *  - Grid snapping uses a tighter tolerance than object snapping, so clips
 *    prefer neighbouring clip edges but still click onto the grid.
 */

import { clamp } from './utils.js'

export const SNAP_TOLERANCE_PX = 9
export const GRID_TOLERANCE_PX = 5

/**
 * @param {object} args
 * @param {number} args.pxPerSec
 * @param {number} args.gridSec
 * @param {number} args.duration
 * @param {Array<{id:string,start:number,duration:number}>} args.clips  clips on other tracks
 * @param {number} args.playhead
 * @param {number[]} args.anchors   times to test (1 for an edge, 2 for both edges, 3 with centre)
 * @param {boolean} args.enabled
 * @returns {{delta:number, snapped:boolean, guide:number|null, kind:'grid'|'clip'|'playhead'|null}}
 */
export function resolveSnap({
  pxPerSec,
  gridSec,
  duration,
  clips = [],
  playhead = null,
  anchors,
  enabled = true,
}) {
  if (!enabled || anchors.length === 0) {
    return { delta: 0, snapped: false, guide: null, kind: null }
  }

  const grid = Math.max(gridSec, 1 / 240)
  const candidates = []

  // Object snaps: every visible edge of every other clip.
  for (const clip of clips) {
    if (!Number.isFinite(clip.start) || !Number.isFinite(clip.duration)) continue
    candidates.push({ t: clip.start, kind: 'clip', weight: 1 })
    candidates.push({ t: clip.start + clip.duration, kind: 'clip', weight: 1 })
  }

  if (playhead !== null && Number.isFinite(playhead)) {
    candidates.push({ t: playhead, kind: 'playhead', weight: 1.4 })
  }

  let best = null

  for (const anchor of anchors) {
    // Grid pass.
    const nearestGrid = Math.round(anchor / grid) * grid
    const gridDistPx = Math.abs(nearestGrid - anchor) * pxPerSec
    if (gridDistPx <= GRID_TOLERANCE_PX) {
      const corrected = clamp(nearestGrid, 0, duration)
      if (
        !best ||
        gridDistPx / 2 < best.distPx ||
        (gridDistPx / 2 === best.distPx && best.kind === 'clip')
      ) {
        best = {
          distPx: gridDistPx / 2,
          delta: corrected - anchor,
          guide: nearestGrid,
          kind: 'grid',
        }
      }
    }

    // Object pass.
    for (const c of candidates) {
      if (Math.abs(c.t - anchor) < 1e-6) continue // it is already touching
      const distPx = Math.abs(c.t - anchor) * pxPerSec
      const tolerance = SNAP_TOLERANCE_PX * c.weight
      if (distPx > tolerance) continue
      const effective = distPx / c.weight
      if (!best || effective < best.distPx) {
        best = {
          distPx: effective,
          delta: c.t - anchor,
          guide: c.t,
          kind: c.kind,
        }
      }
    }
  }

  if (!best) return { delta: 0, snapped: false, guide: null, kind: null }

  return {
    delta: best.delta,
    snapped: true,
    guide: best.guide,
    kind: best.kind,
  }
}

/** All clips that are *not* the ones being manipulated, for candidate harvesting. */
export function otherClips(tracks, excludeIds = []) {
  const out = []
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (excludeIds.includes(clip.id)) continue
      out.push(clip)
    }
  }
  return out
}
