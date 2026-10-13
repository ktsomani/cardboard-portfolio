import { useCallback, useRef } from 'react'
import Clip from './Clip.jsx'
import TrackHeader from './TrackHeader.jsx'
import Ruler from './Ruler.jsx'
import Playhead from './Playhead.jsx'
import SnapGuide from './SnapGuide.jsx'
import { DURATION, GRID_SEC, TRACK_HEADER_PX } from '../store.jsx'
import { useClipDrag } from '../hooks/useClipDrag.js'

const TRACK_HEIGHT = 58
const RULER_HEIGHT = 32

function ClipRow({ clip, track, pxPerSec, selected, active, remoteBy }) {
  const { onPointerDown, onPointerMove, onPointerUp, isDragging, guide } = useClipDrag({
    clip,
    pxPerSec,
  })

  return (
    <>
      <Clip
        clip={clip}
        trackId={track.id}
        pxPerSec={pxPerSec}
        selected={selected}
        active={active}
        remoteBy={remoteBy}
        dragging={isDragging}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {guide && <SnapGuide guide={guide} pxPerSec={pxPerSec} height={TRACK_HEIGHT} />}
    </>
  )
}

export default function Timeline({ state, dispatch, actions, remotePeerByClip }) {
  const { tracks, selection, playhead, pxPerSec, snapEnabled } = state
  const lanesRef = useRef(null)
  const rulerRef = useRef(null)
  const scrubbing = useRef(false)

  const width = Math.max(1200, DURATION * pxPerSec + 260)
  const totalHeight = tracks.length * TRACK_HEIGHT

  /* ---- scroll sync: the ruler rides along with the lanes ------------------ */
  // Written straight to the DOM: scroll fires far too often to re-render the
  // whole lane tree, and the ruler only needs one property.
  const onScroll = useCallback(() => {
    const el = lanesRef.current
    const ruler = rulerRef.current
    if (!el || !ruler) return
    if (ruler.scrollLeft !== el.scrollLeft) ruler.scrollLeft = el.scrollLeft
  }, [])

  /* ---- scrubbing on empty lane space -------------------------------------- */
  const timeFromEvent = useCallback(
    (clientX) => {
      const el = lanesRef.current
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      const x = clientX - rect.left + el.scrollLeft
      return Math.max(0, Math.min(DURATION, x / pxPerSec))
    },
    [pxPerSec],
  )

  const onLanePointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return
      // Only empty lane space scrubs; clip handlers stop propagation.
      dispatch(actions.clearSelection())
      scrubbing.current = true
      event.currentTarget.setPointerCapture?.(event.pointerId)
      dispatch(actions.setPlayhead(timeFromEvent(event.clientX)))
    },
    [actions, dispatch, timeFromEvent],
  )

  const onLanePointerMove = useCallback(
    (event) => {
      if (!scrubbing.current) return
      dispatch(actions.setPlayhead(timeFromEvent(event.clientX)))
    },
    [actions, dispatch, timeFromEvent],
  )

  const endLaneScrub = useCallback((event) => {
    scrubbing.current = false
    event?.currentTarget?.releasePointerCapture?.(event.pointerId)
  }, [])

  /* ---- double-click empty space adds a clip ------------------------------- */
  const onLaneDoubleClick = useCallback(
    (event, trackId) => {
      dispatch(
        actions.addClipAt({
          trackId,
          start: Math.max(0, timeFromEvent(event.clientX) - 1),
        }),
      )
    },
    [actions, dispatch, timeFromEvent],
  )

  const grid = GRID_SEC

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-ink-950">
      <div
        ref={lanesRef}
        onScroll={onScroll}
        className="scroll-thin relative min-h-0 flex-1 overflow-auto"
      >
        <div className="relative" style={{ width: TRACK_HEADER_PX + width }}>
          {/* ruler, pinned to the top of the scroll container */}
          <div className="sticky top-0 z-30 flex h-8 bg-ink-900/95 backdrop-blur-sm">
            <div className="flex w-44 shrink-0 items-center gap-1.5 border-r border-b border-white/[0.07] px-2.5">
              <span className="text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
                Timeline
              </span>
            </div>
            <Ruler
              pxPerSec={pxPerSec}
              width={width}
              playhead={playhead}
              dispatch={dispatch}
              actions={actions}
              rulerRef={rulerRef}
            />
          </div>

          {/* lanes */}
          <div className="relative">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex border-b border-white/[0.05]"
                style={{ height: TRACK_HEIGHT }}
              >
                <div className="sticky left-0 z-20 bg-ink-900">
                  <TrackHeader
                    track={track}
                    onToggle={(trackId, flag) =>
                      dispatch(actions.toggleTrackFlag({ trackId, flag }))
                    }
                    onAddClip={(trackId) =>
                      dispatch(
                        actions.addClipAt({
                          trackId,
                          start: Math.max(0, playhead - 1.5),
                          kind: track.kind === 'audio' ? 'audio' : 'video',
                        }),
                      )
                    }
                  />
                </div>

                <div
                  className="relative"
                  style={{
                    width,
                    backgroundImage: `repeating-linear-gradient(90deg,
                      color-mix(in oklab, white 4%, transparent) 0 1px,
                      transparent 1px ${grid * pxPerSec}px)`,
                  }}
                  onPointerDown={track.locked ? undefined : onLanePointerDown}
                  onPointerMove={onLanePointerMove}
                  onPointerUp={endLaneScrub}
                  onDoubleClick={
                    track.locked ? undefined : (e) => onLaneDoubleClick(e, track.id)
                  }
                >
                  {track.clips.map((clip) => (
                    <ClipRow
                      key={clip.id}
                      clip={clip}
                      track={track}
                      pxPerSec={pxPerSec}
                      selected={selection.includes(clip.id)}
                      active={playhead >= clip.start && playhead < clip.start + clip.duration}
                      remoteBy={remotePeerByClip?.get(clip.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* playhead spans the lanes + ruler */}
          <div
            className="pointer-events-none absolute top-0 left-44"
            style={{ width, height: totalHeight + RULER_HEIGHT }}
          >
            <Playhead
              time={playhead}
              pxPerSec={pxPerSec}
              height={totalHeight + RULER_HEIGHT}
              playing={state.playing}
            />
          </div>
        </div>
      </div>

      {/* status strip */}
      <footer className="flex h-7 items-center gap-3 border-t border-white/[0.07] bg-ink-900 px-3 text-[10.5px] text-ink-500">
        <span className="tabnum">
          {tracks.length} tracks · {tracks.reduce((n, t) => n + t.clips.length, 0)} clips
        </span>
        <span className="text-ink-600">|</span>
        <span className="tabnum">grid {grid}s</span>
        <span className="text-ink-600">|</span>
        <span className={snapEnabled ? 'text-peer-2' : 'text-ink-500'}>
          snapping {snapEnabled ? 'on' : 'off'}
        </span>
        <span className="ml-auto hidden md:inline">
          Double-click empty lane space to add a clip
        </span>
      </footer>
    </div>
  )
}

export { TRACK_HEIGHT, RULER_HEIGHT }
