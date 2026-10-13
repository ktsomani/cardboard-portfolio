import { useCallback, useEffect, useRef, useState } from 'react'
import { DURATION, GRID_SEC, MIN_CLIP_SEC, useTimeline } from '../store.jsx'
import { resolveSnap, otherClips } from '../lib/snap.js'
import { clamp, fixFloat } from '../lib/utils.js'

/**
 * Clip geometry with snapping, expressed as a hook so Clip and the timeline
 * guides agree on the same math.
 *
 * Time is the source of truth (clip.start / clip.duration in seconds).
 * Pixels are derived. Drags convert pointer pixels -> seconds once, then snap
 * in pixel space, which is what makes the feel zoom-independent.
 */
export function useClipDrag({ clip, pxPerSec }) {
  const { state, dispatch } = useTimeline()
  const [guide, setGuide] = useState(null)
  const drag = useRef(null)

  const { snapEnabled } = state

  const onPointerDown = useCallback(
    (event, edge) => {
      if (event.button !== 0) return
      const target = event.currentTarget
      target.setPointerCapture?.(event.pointerId)
      const tracks = state.tracks
      const siblings = otherClips(tracks, [clip.id])
      drag.current = {
        edge, // 'move' | 'left' | 'right'
        pointerId: event.pointerId,
        startX: event.clientX,
        originStart: clip.start,
        originDuration: clip.duration,
        moved: false,
        siblings,
      }
      dispatch({ type: 'select', ids: [clip.id], additive: event.shiftKey })

      /*
       * Pressing a clip body also parks the playhead where you pressed.
       *
       * The clip calls stopPropagation so that clip clicks do not scrub the
       * whole lane, which otherwise left the playhead stranded wherever it was
       * and made S-to-split impossible to trigger by clicking a clip. Doing it
       * only for the body (not the trim handles) keeps trimming from moving it.
       */
      if (edge === 'move') {
        const rect = target.parentElement?.getBoundingClientRect()
        if (rect) {
          const withinLane = event.clientX - rect.left
          dispatch({ type: 'setPlayhead', time: clamp(withinLane / pxPerSec, 0, DURATION) })
        }
      }
      event.stopPropagation()
    },
    [clip.duration, clip.id, clip.start, dispatch, pxPerSec, state.tracks],
  )

  const onPointerMove = useCallback(
    (event) => {
      const d = drag.current
      if (!d || d.pointerId !== event.pointerId) return

      const dxPx = event.clientX - d.startX
      if (Math.abs(dxPx) > 2) d.moved = true
      if (!d.moved) return

      const dtSec = dxPx / pxPerSec
      const { playhead } = state

      if (d.edge === 'move') {
        const rawStart = clamp(d.originStart + dtSec, 0, DURATION - d.originDuration)
        const snap = resolveSnap({
          pxPerSec,
          gridSec: GRID_SEC,
          duration: DURATION,
          clips: d.siblings,
          playhead,
          anchors: [rawStart, rawStart + d.originDuration],
          enabled: snapEnabled,
        })
        let nextStart = rawStart + snap.delta
        nextStart = clamp(nextStart, 0, DURATION - d.originDuration)
        if (event.altKey) nextStart = rawStart // alt = temporarily disable snapping
        setGuide(snap.snapped && !event.altKey ? snap : null)
        dispatch({
          type: 'moveClips',
          moves: [{ id: clip.id, start: fixFloat(nextStart) }],
          transient: true,
        })
        return
      }

      if (d.edge === 'right') {
        const rawEnd = clamp(
          d.originStart + d.originDuration + dtSec,
          d.originStart + MIN_CLIP_SEC,
          DURATION,
        )
        const snap = resolveSnap({
          pxPerSec,
          gridSec: GRID_SEC,
          duration: DURATION,
          clips: d.siblings,
          playhead,
          anchors: [rawEnd],
          enabled: snapEnabled && !event.altKey,
        })
        const nextDuration = Math.max(MIN_CLIP_SEC, rawEnd + snap.delta - d.originStart)
        setGuide(snap.snapped ? { ...snap, guide: d.originStart + nextDuration } : null)
        dispatch({
          type: 'resizeClip',
          id: clip.id,
          edge: 'right',
          start: d.originStart,
          duration: fixFloat(nextDuration),
          transient: true,
        })
        return
      }

      // Left edge: start moves, end stays pinned.
      const pinnedEnd = d.originStart + d.originDuration
      const rawStart = clamp(d.originStart + dtSec, 0, pinnedEnd - MIN_CLIP_SEC)
      const snap = resolveSnap({
        pxPerSec,
        gridSec: GRID_SEC,
        duration: DURATION,
        clips: d.siblings,
        playhead,
        anchors: [rawStart],
        enabled: snapEnabled && !event.altKey,
      })
      const nextStart = Math.max(0, rawStart + snap.delta)
      setGuide(snap.snapped ? { ...snap, guide: nextStart } : null)
      dispatch({
        type: 'resizeClip',
        id: clip.id,
        edge: 'left',
        start: fixFloat(nextStart),
        duration: fixFloat(pinnedEnd - nextStart),
        transient: true,
      })
    },
    [clip.id, dispatch, pxPerSec, snapEnabled, state],
  )

  const endDrag = useCallback(
    (event) => {
      const d = drag.current
      if (!d) return
      drag.current = null
      setGuide(null)
      // One history entry for the whole gesture: transient updates skipped the
      // past stack, so we commit the finished state in a single step.
      if (d.moved) dispatch({ type: 'commitHistory' })
      event?.currentTarget?.releasePointerCapture?.(event.pointerId)
    },
    [dispatch],
  )

  useEffect(() => () => setGuide(null), [])

  return { onPointerDown, onPointerMove, onPointerUp: endDrag, isDragging: Boolean(guide), guide }
}
