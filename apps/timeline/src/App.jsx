import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TimelineProvider, actions, allClips, useTimeline, DURATION } from './store.jsx'
import Toolbar from './components/Toolbar.jsx'
import Preview from './components/Preview.jsx'
import Timeline from './components/Timeline.jsx'
import PeerCursors from './components/PeerCursors.jsx'
import ActivityFeed from './components/ActivityFeed.jsx'
import { usePeerPresence } from './hooks/useFakePeers.js'

/** Sends the user back to the portfolio shell, whichever way it is embedded. */
function goToPortfolio() {
  const target = 'http://localhost:5180/'
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'demo:exit' }, '*')
      return
    }
  } catch {
    /* cross-origin parent: fall through to a plain navigation */
  }
  window.location.assign(target)
}

const TIPS = [
  'Drag a clip. Its edges trim. Alt bypasses snapping.',
  'Double-click empty lane space to drop a new clip.',
  'S splits the selection (or whatever sits under the playhead).',
  'Both cursors are simulated locally — no server in this build.',
]

function Workspace() {
  const { state, dispatch } = useTimeline()
  const [toast, setToast] = useState(null)
  const { peers, activity } = usePeerPresence({ state, dispatch })

  // The clock reads the playhead from a ref so the rAF loop is *not* torn down
  // and rebuilt on every frame. `playing` is the only dependency that matters.
  const playheadRef = useRef(state.playhead)
  playheadRef.current = state.playhead

  /* ---- playback clock ---------------------------------------------------- */
  useEffect(() => {
    if (!state.playing) return undefined
    let raf = 0
    let last = performance.now()
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const next = playheadRef.current + dt
      if (next >= DURATION) {
        dispatch(actions.setPlayhead(DURATION))
        dispatch(actions.togglePlay())
        return
      }
      dispatch(actions.setPlayhead(next))
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [state.playing, dispatch])

  /* ---- transient messages ------------------------------------------------ */
  const flash = useCallback((message) => {
    setToast({ message, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const t = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!state.playing) return undefined
    const t = window.setTimeout(() => {
      setToast({ message: TIPS[Math.floor(Math.random() * TIPS.length)], id: Date.now() })
    }, 900)
    return () => window.clearTimeout(t)
  }, [state.playing])

  /* ---- keyboard ---------------------------------------------------------- */
  useEffect(() => {
    const onKey = (event) => {
      const el = event.target
      if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.isContentEditable)) return
      const mod = event.metaKey || event.ctrlKey
      const { selection, playhead } = state

      if (event.code === 'Space') {
        event.preventDefault()
        dispatch(actions.togglePlay())
        return
      }
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        dispatch(event.shiftKey ? actions.redo() : actions.undo())
        return
      }
      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        dispatch(actions.duplicateSelection())
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!selection.length) return
        event.preventDefault()
        dispatch(actions.deleteSelection())
        return
      }
      if (event.key.toLowerCase() === 's' && !mod) {
        // Same feedback path as the toolbar button: the reducer reports why a
        // split did nothing, so the two entry points cannot diverge.
        dispatch(actions.splitAtPlayhead(flash))
        return
      }
      if (event.key === 'Home') {
        dispatch(actions.setPlayhead(0))
        return
      }
      if (event.key === 'End') {
        dispatch(actions.setPlayhead(DURATION))
        return
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.shiftKey ? 1 : 1 / 30
        const dir = event.key === 'ArrowLeft' ? -1 : 1
        if (selection.length) {
          dispatch(actions.nudgeSelection(dir * step))
        } else {
          dispatch(actions.setPlayhead(Math.max(0, Math.min(DURATION, playhead + dir * step))))
        }
        return
      }
      if (event.key === '=' || event.key === '+') dispatch(actions.setZoom(state.pxPerSec * 1.25))
      if (event.key === '-') dispatch(actions.setZoom(state.pxPerSec / 1.25))
      if (event.key === '0') dispatch(actions.setZoom(74))
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, dispatch, flash])

  /* ---- which clip is each peer touching right now ------------------------ */
  const remotePeerByClip = useMemo(() => {
    const map = new Map()
    const editing = peers.filter((p) => p.status === 'editing')
    if (!editing.length) return map
    const clips = allClips(state.tracks)
    editing.forEach((peer, i) => {
      const clip = clips[(Math.floor(peer.x + peer.y) + i) % Math.max(1, clips.length)]
      if (clip) map.set(clip.id, peer)
    })
    return map
  }, [peers, state.tracks])

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden bg-ink-950"
      // State exposed for automated interaction tests: scraping the rendered
      // text to read the playhead was ambiguous (several timecodes on screen)
      // and produced false failures.
      data-playhead={state.playhead.toFixed(3)}
      data-selection={state.selection.join(',')}
      data-clip-count={allClips(state.tracks).length}
      data-playing={String(state.playing)}
      data-px-per-sec={state.pxPerSec}
    >
      <Toolbar
        state={state}
        dispatch={dispatch}
        actions={actions}
        peers={peers}
        onSplitFailure={flash}
        onBack={goToPortfolio}
      />

      <Preview state={state} dispatch={dispatch} actions={actions} />

      <Timeline
        state={state}
        dispatch={dispatch}
        actions={actions}
        remotePeerByClip={remotePeerByClip}
      />

      <ActivityFeed items={activity} />
      <PeerCursors peers={peers} />

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className="pointer-events-none absolute bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-ink-800/95 px-3.5 py-1.5 text-[11.5px] text-ink-200 shadow-2xl backdrop-blur-md"
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <TimelineProvider>
      <Workspace />
    </TimelineProvider>
  )
}
