import { useCallback, useMemo, useRef } from 'react'
import { DURATION, GRID_SEC } from '../store.jsx'
import { labelForTime, labelStep, tickDivisions } from '../lib/scale.js'
import { clamp } from '../lib/utils.js'

/**
 * The scrub ruler. Pointer-down anywhere starts a scrub and captures the
 * pointer, so a drag that leaves the ruler keeps tracking — the detail that
 * separates a real NLE scrub from a slider.
 */
export default function Ruler({ pxPerSec, width, playhead, dispatch, actions, rulerRef, onScroll }) {
  const labels = useMemo(() => {
    const step = labelStep(pxPerSec)
    const out = []
    for (let t = 0; t <= DURATION + 1e-6; t += step) out.push({ t, step })
    return out
  }, [pxPerSec])

  const scrubbing = useRef(false)
  const contentRef = useRef(null)

  const timeFromEvent = useCallback(
    (clientX) => {
      const el = contentRef.current
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      return clamp((clientX - rect.left) / pxPerSec, 0, DURATION)
    },
    [pxPerSec],
  )

  const onPointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return
      event.currentTarget.setPointerCapture?.(event.pointerId)
      scrubbing.current = true
      dispatch(actions.setPlayhead(timeFromEvent(event.clientX)))
    },
    [actions, dispatch, timeFromEvent],
  )

  const onPointerMove = useCallback(
    (event) => {
      if (!scrubbing.current) return
      dispatch(actions.setPlayhead(timeFromEvent(event.clientX)))
    },
    [actions, dispatch, timeFromEvent],
  )

  const endScrub = useCallback((event) => {
    scrubbing.current = false
    event?.currentTarget?.releasePointerCapture?.(event.pointerId)
  }, [])

  const grid = GRID_SEC

  return (
    <div
      ref={rulerRef}
      onScroll={onScroll}
      className="scroll-thin sticky top-0 z-20 w-44 shrink-0 overflow-x-auto overflow-y-hidden
        border-b border-white/[0.07] bg-ink-900/95 backdrop-blur-sm"
      style={{ width: '100%', scrollbarWidth: 'none' }}
    >
      <div
        ref={contentRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        role="slider"
        tabIndex={0}
        aria-label="Playhead position"
        aria-valuemin={0}
        aria-valuemax={DURATION}
        aria-valuenow={Number(playhead.toFixed(2))}
        className="relative h-8 cursor-ew-resize select-none"
        style={{
          width,
          touchAction: 'none',
          backgroundImage: `repeating-linear-gradient(90deg,
            color-mix(in oklab, white 10%, transparent) 0 1px,
            transparent 1px ${grid * pxPerSec}px)`,
        }}
      >
        {labels.map(({ t, step }) => (
          <div key={t} className="absolute top-0 h-full" style={{ left: t * pxPerSec }}>
            <span className="absolute top-0 h-2 w-px bg-white/35" />
            {Array.from({ length: tickDivisions - 1 }).map((_, i) => (
              <span
                key={i}
                className="absolute h-1 w-px bg-white/12"
                style={{ left: ((i + 1) * step * pxPerSec) / tickDivisions }}
              />
            ))}
            <span className="tabnum absolute top-2 left-1.5 font-mono text-[10px] whitespace-nowrap text-ink-400">
              {labelForTime(t, step)}
            </span>
            <span className="absolute bottom-0 h-1 w-px bg-white/15" />
          </div>
        ))}
      </div>
    </div>
  )
}
