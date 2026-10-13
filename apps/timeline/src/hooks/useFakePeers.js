import { useEffect, useRef, useSyncExternalStore } from 'react'
import { damp } from '../lib/utils.js'

/**
 * Simulated presence.
 *
 * Design note: cursor positions change every animation frame, so holding them
 * in React state would re-render the entire timeline 60 times a second — clips,
 * ruler, lanes and all. Instead the peer state lives in a tiny external store
 * and only components that genuinely care (the cursor overlay, the presence
 * chips, the activity feed) subscribe to it. The timeline tree is untouched by
 * cursor movement, and nothing calls setState from inside a render.
 *
 * There is no server here. The peers are driven by a local scheduler so the
 * collaboration *interaction* can be felt and judged; the transport is the part
 * that would be swapped for a real CRDT channel.
 */

const PEER_DEFS = [
  { id: 'peer_1', name: 'Rauno', initials: 'RA', color: '#6ea8ff', role: 'editing Main' },
  { id: 'peer_2', name: 'Ana', initials: 'AN', color: '#52d4a8', role: 'reviewing titles' },
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))

function createPeerStore() {
  let state = {
    peers: PEER_DEFS.map((p, i) => ({
      ...p,
      x: 420 + i * 220,
      y: 320 + i * 90,
      status: 'idle',
      lastEditAt: 0,
    })),
    activity: [],
  }
  const listeners = new Set()
  /** Pending paint, coalesced so a burst of commits causes one notification. */
  let scheduled = false

  const emit = () => listeners.forEach((l) => l())

  /**
   * Notify subscribers, but never synchronously from inside the animation-frame
   * callback that produced the change. A synchronous notify can land while React
   * is mid-render, which React reports as "Cannot update a component while
   * rendering a different component". Coalescing into one deferred
   * notification is both correct and cheaper.
   */
  const scheduleEmit = () => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      emit()
    })
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    /** Mutate without notifying: used during the damping loop. */
    setPeers(next) {
      state = { ...state, peers: next }
    },
    /** Swap in a new state object and schedule a notification. */
    commit(next) {
      state = next
      scheduleEmit()
    },
    pushActivity(entry) {
      state = { ...state, activity: [entry, ...state.activity].slice(0, 6) }
      // Also deferred: called from the same animation-frame callback.
      scheduleEmit()
    },
  }
}

export function usePeerPresence({ state, dispatch }) {
  // One store per hook instance, created lazily.
  const storeRef = useRefStore()
  const store = storeRef.current

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  const stateRef = useRef(state)
  stateRef.current = state
  const nextEditAt = useRef(performance.now() + 5200)

  /* One RAF loop for every peer: eased pursuit, then a rare landed edit. */
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let sinceCommit = 0

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      sinceCommit += dt

      const scheduleTarget = (peer) => ({
        ...peer,
        targetX: 160 + Math.random() * Math.max(200, window.innerWidth - 320),
        targetY: 140 + Math.random() * Math.max(160, window.innerHeight - 320),
        retargetAt: now + 900 + Math.random() * 2200,
      })

      const moved = store.getSnapshot().peers.map((peer) => {
        const p = needsRetarget(peer, now) ? scheduleTarget(peer) : peer
        const distance = Math.hypot(p.targetX - p.x, p.targetY - p.y)
        const lambda = distance > 220 ? 3.4 : 2.2
        return {
          ...p,
          x: damp(p.x, p.targetX, lambda, dt),
          y: damp(p.y, p.targetY, lambda, dt),
        }
      })

      // A peer "lands" an edit at most every ~5s, never on a locked track.
      if (now > nextEditAt.current) {
        const actor = moved[Math.floor(Math.random() * moved.length)]
        const live = stateRef.current
        const candidates = live.tracks.filter((t) => !t.locked).flatMap((t) => t.clips)
        if (candidates.length) {
          const target = candidates[Math.floor(Math.random() * candidates.length)]
          const delta = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.round(Math.random() * 2) * 0.25)
          const start = Math.max(0, Math.min(45 - target.duration, target.start + delta))
          const rounded = Math.round(start * 4) / 4

          /*
           * Remote edits land in the document but deliberately do NOT enter the
           * local undo stack: undo should step back through *your* actions, not
           * a colleague's. Without `transient`, peer activity silently consumes
           * history slots and a single Ctrl+Z appears to do nothing.
           */
          dispatch({
            type: 'moveClips',
            moves: [{ id: target.id, start: rounded }],
            by: actor.id,
            transient: true,
          })
          // A remote edit must never discard the local user's selection.
          store.pushActivity({
            id: `${actor.id}_${Math.round(now)}`,
            peerId: actor.id,
            peerName: actor.name,
            color: actor.color,
            verb: 'moved',
            detail: target.name,
            to: `${rounded.toFixed(2)}s`,
            at: now,
          })

          const withEditing = moved.map((p) => (p.id === actor.id ? { ...p, status: 'editing' } : p))
          store.commit({ ...store.getSnapshot(), peers: withEditing })
          window.setTimeout(() => {
            const cleared = store
              .getSnapshot()
              .peers.map((p) => (p.id === actor.id ? { ...p, status: 'idle' } : p))
            store.commit({ ...store.getSnapshot(), peers: cleared })
          }, 1100)

          nextEditAt.current = now + 5200 + Math.random() * 4500
          raf = requestAnimationFrame(tick)
          return
        }
      }

      store.setPeers(moved)
      // Cursors only need to look smooth at ~30fps; committing at 60 wasted
      // renders for movement the eye cannot resolve.
      if (sinceCommit > 1 / 30) {
        sinceCommit = 0
        store.commit({ ...store.getSnapshot(), peers: moved })
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [dispatch, store])

  return { peers: snapshot.peers, activity: snapshot.activity }
}

/** True when a peer has arrived and should pick a new destination. */
const needsRetarget = (peer, now) => !peer.retargetAt || now > peer.retargetAt

/* Tiny helper so the store is created exactly once per component instance. */
function useRefStore() {
  const ref = useRef(null)
  if (ref.current === null) ref.current = createPeerStore()
  return ref
}

export { PEER_DEFS }
