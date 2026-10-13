import { createContext, useContext, useMemo, useReducer } from 'react'
import { clamp, fixFloat, uid } from './lib/utils.js'

export const FPS = 30
export const DURATION = 45 // seconds of timeline
export const GRID_SEC = 0.25 // one frame-ish grid at 4fps subdivisions
export const MIN_CLIP_SEC = 0.2
export const TRACK_HEADER_PX = 176

export const CLIP_KINDS = {
  video: { label: 'Video', chip: '#6ea8ff' },
  audio: { label: 'Audio', chip: '#52d4a8' },
  text: { label: 'Text', chip: '#ffb454' },
  adjustment: { label: 'Adjustment', chip: '#c084fc' },
}

const clip = (id, name, kind, start, duration, extra = {}) => ({
  id,
  name,
  kind,
  start,
  duration,
  sourceIn: 0,
  sourceDuration: duration + (extra.sourcePad ?? 4),
  ...extra,
})

export const initialState = {
  projectName: 'Sprint 01 — Timeline',
  tracks: [
    {
      id: 'tr_text',
      name: 'Titles',
      kind: 'text',
      muted: false,
      locked: false,
      hidden: false,
      clips: [clip('clip_t1', 'Lower third', 'text', 4.5, 3.5)],
    },
    {
      id: 'tr_v2',
      name: 'Overlay',
      kind: 'video',
      muted: false,
      locked: false,
      hidden: false,
      clips: [
        clip('clip_o1', 'Screen capture', 'video', 9.25, 5.5, { offset: 1 }),
        clip('clip_o2', 'Logo sting', 'video', 18.5, 2.25),
      ],
    },
    {
      id: 'tr_v1',
      name: 'Main',
      kind: 'video',
      muted: false,
      locked: false,
      hidden: false,
      clips: [
        clip('clip_m1', 'Establishing shot', 'video', 0, 4.25),
        clip('clip_m2', 'Studio wide', 'video', 4.75, 4.5),
        clip('clip_m3', 'Hands on keyboard', 'video', 9.5, 6),
        clip('clip_m4', 'Interview A-cam', 'video', 16, 7.5),
        clip('clip_m5', 'B-roll — server room', 'video', 24, 5.25),
        clip('clip_m6', 'Product close-up', 'video', 29.75, 4.5),
      ],
    },
    {
      id: 'tr_a1',
      name: 'Dialogue',
      kind: 'audio',
      muted: false,
      locked: false,
      hidden: false,
      clips: [
        clip('clip_a1', 'VO take 3', 'audio', 0.5, 8, { gain: 0.9 }),
        clip('clip_a2', 'VO take 7', 'audio', 9.75, 6.25, { gain: 1 }),
        clip('clip_a3', 'Interview lav', 'audio', 16.5, 9, { gain: 0.85 }),
      ],
    },
    {
      id: 'tr_a2',
      name: 'Music',
      kind: 'audio',
      muted: false,
      locked: false,
      hidden: false,
      clips: [clip('clip_a4', 'Score — cold open', 'audio', 0, 21, { gain: 0.35 })],
    },
  ],
  selection: [],
  playhead: 4.5,
  playing: false,
  pxPerSec: 74,
  snapEnabled: true,
  rippleEnabled: false,
  /** True while a pointer drag is streaming; guards double undo entries. */
  gestureActive: false,
  past: [],
  future: [],
}

/* ------------------------------------------------------------------ actions */

export const actions = {
  togglePlay: () => ({ type: 'togglePlay' }),
  setPlayhead: (time, transient = false) => ({ type: 'setPlayhead', time, transient }),
  select: (ids, additive = false) => ({ type: 'select', ids, additive }),
  clearSelection: () => ({ type: 'clearSelection' }),

  moveClips: ({ moves, transient = false, by = 'you' }) => ({
    type: 'moveClips',
    moves,
    transient,
    by,
  }),  resizeClip: ({ id, edge, start, duration, transient = false, by = 'you' }) => ({
    type: 'resizeClip',
    id,
    edge,
    start,
    duration,
    transient,
    by,
  }),
  trimSource: ({ id, sourceIn, sourceDuration }) => ({
    type: 'trimSource',
    id,
    sourceIn,
    sourceDuration,
  }),
  /** Closes a transient gesture: one undo entry for the whole drag. */
  commitHistory: () => ({ type: 'commitHistory' }),

  /**
   * @param {(reason: string) => void} [onNoop] called when there is nothing to
   * split, so both the toolbar button and the S key can explain the no-op
   * instead of silently doing nothing.
   */
  splitAtPlayhead: (onNoop) => ({ type: 'splitAtPlayhead', onNoop }),
  deleteSelection: () => ({ type: 'deleteSelection' }),
  duplicateSelection: () => ({ type: 'duplicateSelection' }),
  nudgeSelection: (deltaSec) => ({ type: 'nudgeSelection', deltaSec }),
  addClipAt: ({ trackId, start, kind = 'video' }) => ({ type: 'addClipAt', trackId, start, kind }),
  toggleTrackFlag: ({ trackId, flag }) => ({ type: 'toggleTrackFlag', trackId, flag }),
  setZoom: (pxPerSec) => ({ type: 'setZoom', pxPerSec }),
  toggleSnap: () => ({ type: 'toggleSnap' }),
  toggleRipple: () => ({ type: 'toggleRipple' }),
  undo: () => ({ type: 'undo' }),
  redo: () => ({ type: 'redo' }),
  setGain: ({ id, gain }) => ({ type: 'setGain', id, gain }),
  renameProject: (name) => ({ type: 'renameProject', name }),
}

/* ------------------------------------------------------------------ reducer */

const HISTORY_LIMIT = 60
const UNDOABLE = new Set([
  'moveClips',
  'resizeClip',
  'trimSource',
  'splitAtPlayhead',
  'deleteSelection',
  'duplicateSelection',
  'nudgeSelection',
  'addClipAt',
  'toggleTrackFlag',
  'setGain',
])

const findClip = (tracks, id) => {
  for (const track of tracks) {
    const found = track.clips.find((c) => c.id === id)
    if (found) return { track, clip: found }
  }
  return null
}

const mapTracks = (tracks, fn) => tracks.map((track) => fn(track) ?? track)

const withHistory = (state, next) => {
  if (state.past.length && state.past[state.past.length - 1] === state.tracks) return state
  return {
    ...state,
    tracks: next,
    past: [...state.past, state.tracks].slice(-HISTORY_LIMIT),
    future: [],
  }
}

/** Close small gaps created when a clip is removed, if ripple is on. */
function rippleAfterDelete(tracks, removed, rippleEnabled) {
  if (!rippleEnabled) return tracks
  return tracks.map((track) => {
    const gone = removed.filter((r) => r.trackId === track.id)
    if (!gone.length) return track
    let clips = [...track.clips]
    for (const r of gone.sort((a, b) => a.start - b.start)) {
      clips = clips.map((c) =>
        c.start >= r.start + r.duration - 1e-6
          ? { ...c, start: fixFloat(Math.max(0, c.start - r.duration)) }
          : c,
      )
    }
    return { ...track, clips }
  })
}

export function reducer(state, action) {
  switch (action.type) {
    case 'togglePlay':
      return { ...state, playing: !state.playing }

    case 'setPlayhead':
      return { ...state, playhead: clamp(action.time, 0, DURATION) }

    case 'select': {
      const ids = action.additive
        ? state.selection.includes(action.ids[0])
          ? state.selection.filter((id) => !action.ids.includes(id))
          : [...new Set([...state.selection, ...action.ids])]
        : action.ids
      return { ...state, selection: ids }
    }

    case 'clearSelection':
      return { ...state, selection: [] }

    case 'moveClips': {
      const byId = new Map(action.moves.map((m) => [m.id, m]))
      const tracks = mapTracks(state.tracks, (track) => ({
        ...track,
        clips: track.clips.map((c) => {
          const m = byId.get(c.id)
          if (!m) return c
          return { ...c, start: fixFloat(clamp(m.start, 0, Math.max(0, DURATION - c.duration))) }
        }),
      }))
      if (!action.transient) return withHistory(state, tracks)
      // First transient frame of a gesture is where the undo entry is born.
      return state.gestureActive
        ? { ...state, tracks }
        : {
            ...state,
            tracks,
            gestureActive: true,
            past: [...state.past, state.tracks].slice(-HISTORY_LIMIT),
            future: [],
          }
    }

    case 'resizeClip': {
      const tracks = mapTracks(state.tracks, (track) => ({
        ...track,
        clips: track.clips.map((c) => {
          if (c.id !== action.id) return c
          const duration = Math.max(MIN_CLIP_SEC, action.duration)
          const start = clamp(action.start, 0, DURATION - duration)
          const sourceDelta =
            action.edge === 'left' ? fixFloat(start - c.start) : 0
          return {
            ...c,
            start: fixFloat(start),
            duration: fixFloat(Math.min(duration, DURATION - start)),
            sourceIn: Math.max(0, fixFloat(c.sourceIn + sourceDelta)),
            sourceDuration: Math.max(
              MIN_CLIP_SEC,
              fixFloat(c.sourceDuration + (action.edge === 'left' ? -sourceDelta : 0)),
            ),
          }
        }),
      }))
      const next = { ...state, tracks }
      if (!action.transient) {
        return { ...next, past: [...state.past, state.tracks].slice(-HISTORY_LIMIT), future: [] }
      }
      return state.gestureActive
        ? next
        : {
            ...next,
            gestureActive: true,
            past: [...state.past, state.tracks].slice(-HISTORY_LIMIT),
            future: [],
          }
    }

    case 'trimSource': {
      const tracks = mapTracks(state.tracks, (track) => ({
        ...track,
        clips: track.clips.map((c) =>
          c.id === action.id
            ? { ...c, sourceIn: action.sourceIn, sourceDuration: action.sourceDuration }
            : c,
        ),
      }))
      return withHistory(state, tracks)
    }

    /**
     * A drag streams `transient` updates without touching the past stack, so
     * the pre-drag tracks are still the top of it. Pushing the current tracks
     * onto `future` at gesture end would double-count; instead we simply clear
     * `future` (a real edit invalidates redo) and keep the existing past entry.
     */
    case 'commitHistory':
      return state.gestureActive ? { ...state, gestureActive: false, future: [] } : state

    case 'splitAtPlayhead': {
      const t = state.playhead
      const inside = (c) => t > c.start + MIN_CLIP_SEC && t < c.start + c.duration - MIN_CLIP_SEC

      // The reducer owns the "why did nothing happen" decision so every caller
      // (button, keyboard) reports the same reason.
      let targets
      if (state.selection.length) {
        const selected = state.tracks
          .flatMap((tr) => tr.clips)
          .filter((c) => state.selection.includes(c.id))
        targets = selected.filter(inside).map((c) => c.id)
        if (!targets.length) {
          action.onNoop?.('Move the playhead inside the selected clip to split it')
          return state
        }
      } else {
        targets = state.tracks
          .filter((tr) => !tr.locked)
          .flatMap((tr) => tr.clips.filter(inside).map((c) => c.id))
        if (!targets.length) {
          action.onNoop?.('Nothing under the playhead to split')
          return state
        }
      }

      const newIds = []
      const tracks = mapTracks(state.tracks, (track) => ({
        ...track,
        clips: track.clips.flatMap((c) => {
          if (!targets.includes(c.id)) return [c]
          const leftDuration = fixFloat(t - c.start)
          const rightDuration = fixFloat(c.duration - leftDuration)
          const rightId = uid('clip')
          newIds.push(rightId)
          return [
            { ...c, duration: leftDuration },
            {
              ...c,
              id: rightId,
              name: `${c.name} ·B`,
              start: fixFloat(t),
              duration: rightDuration,
              sourceIn: fixFloat(c.sourceIn + leftDuration),
            },
          ]
        }),
      }))
      return {
        ...state,
        tracks,
        selection: newIds,
        past: [...state.past, state.tracks].slice(-HISTORY_LIMIT),
        future: [],
      }
    }

    case 'deleteSelection': {
      if (!state.selection.length) return state
      const removed = []
      const tracks = state.tracks.map((track) => {
        const keep = track.clips.filter((c) => {
          if (state.selection.includes(c.id)) {
            removed.push({ trackId: track.id, start: c.start, duration: c.duration })
            return false
          }
          return true
        })
        return keep.length === track.clips.length ? track : { ...track, clips: keep }
      })
      const rippled = rippleAfterDelete(tracks, removed, state.rippleEnabled)
      return {
        ...state,
        tracks: rippled,
        selection: [],
        past: [...state.past, state.tracks].slice(-HISTORY_LIMIT),
        future: [],
      }
    }

    case 'duplicateSelection': {
      if (!state.selection.length) return state
      const newIds = []
      const tracks = mapTracks(state.tracks, (track) => {
        const dupes = []
        for (const c of track.clips) {
          if (!state.selection.includes(c.id)) continue
          const id = uid('clip')
          newIds.push(id)
          const start = clamp(c.start + c.duration + 0.25, 0, DURATION - c.duration)
          dupes.push({ ...c, id, name: `${c.name} copy`, start: fixFloat(start) })
        }
        return dupes.length ? { ...track, clips: [...track.clips, ...dupes] } : track
      })
      return {
        ...state,
        tracks,
        selection: newIds,
        past: [...state.past, state.tracks].slice(-HISTORY_LIMIT),
        future: [],
      }
    }

    case 'nudgeSelection': {
      if (!state.selection.length) return state
      const tracks = mapTracks(state.tracks, (track) => ({
        ...track,
        clips: track.clips.map((c) =>
          state.selection.includes(c.id)
            ? {
                ...c,
                start: fixFloat(clamp(c.start + action.deltaSec, 0, DURATION - c.duration)),
              }
            : c,
        ),
      }))
      return withHistory(state, tracks)
    }

    case 'addClipAt': {
      const track = state.tracks.find((t) => t.id === action.trackId)
      if (!track || track.locked) return state
      const duration = action.kind === 'audio' ? 4 : 3
      const id = uid('clip')
      const start = fixFloat(clamp(action.start, 0, DURATION - duration))
      const created = clip(
        id,
        action.kind === 'audio' ? 'New audio take' : 'New clip',
        action.kind,
        start,
        duration,
      )
      const tracks = mapTracks(state.tracks, (t) =>
        t.id === action.trackId ? { ...t, clips: [...t.clips, created] } : t,
      )
      const next = withHistory(state, tracks)
      return { ...next, selection: [id] }
    }

    case 'toggleTrackFlag': {
      const tracks = mapTracks(state.tracks, (t) =>
        t.id === action.trackId ? { ...t, [action.flag]: !t[action.flag] } : t,
      )
      return withHistory(state, tracks)
    }

    case 'setGain': {
      const tracks = mapTracks(state.tracks, (track) => ({
        ...track,
        clips: track.clips.map((c) => (c.id === action.id ? { ...c, gain: action.gain } : c)),
      }))
      return { ...state, tracks }
    }

    case 'setZoom':
      return { ...state, pxPerSec: clamp(action.pxPerSec, 18, 260) }

    case 'toggleSnap':
      return { ...state, snapEnabled: !state.snapEnabled }

    case 'toggleRipple':
      return { ...state, rippleEnabled: !state.rippleEnabled }

    case 'renameProject':
      return { ...state, projectName: action.name }

    case 'undo': {
      if (!state.past.length) return state
      const previous = state.past[state.past.length - 1]
      return {
        ...state,
        tracks: previous,
        past: state.past.slice(0, -1),
        future: [state.tracks, ...state.future].slice(0, HISTORY_LIMIT),
        selection: [],
        gestureActive: false,
      }
    }

    case 'redo': {
      if (!state.future.length) return state
      const [next, ...rest] = state.future
      return {
        ...state,
        tracks: next,
        past: [...state.past, state.tracks].slice(-HISTORY_LIMIT),
        future: rest,
        selection: [],
        gestureActive: false,
      }
    }

    default:
      return state
  }
}

/* ------------------------------------------------------------------ context */

const TimelineContext = createContext(null)

export function TimelineProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
}

export function useTimeline() {
  const ctx = useContext(TimelineContext)
  if (!ctx) throw new Error('useTimeline must be used inside <TimelineProvider>')
  return ctx
}

/* ------------------------------------------------------------------ selectors */

export const allClips = (tracks) => tracks.flatMap((t) => t.clips)

export const selectedClips = (tracks, selection) =>
  allClips(tracks).filter((c) => selection.includes(c.id))

export const clipAtTime = (track, time) =>
  track.clips.find((c) => time >= c.start && time < c.start + c.duration)

export const projectDuration = (tracks) =>
  Math.max(
    1,
    ...tracks.map((t) => t.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0)),
  )

export const totalClipCount = (tracks) => allClips(tracks).length
