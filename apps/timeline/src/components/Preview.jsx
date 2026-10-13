import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { hashSeed, seededRandom } from '../lib/utils.js'
import { DURATION, selectedClips } from '../store.jsx'

/** A soft, deterministic "frame" so the preview reads as real footage. */
function Frame({ clip, playing }) {
  const seed = hashSeed(clip?.id ?? 'empty')
  const blobs = Array.from({ length: 3 }).map((_, i) => ({
    x: 12 + seededRandom(seed + i * 11) * 66,
    y: 10 + seededRandom(seed + i * 23) * 60,
    r: 26 + seededRandom(seed + i * 31) * 30,
  }))

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: clip
          ? `radial-gradient(120% 90% at 30% 20%, hsl(${200 + (seed % 40)} 30% 26%), #0a0e16 70%)`
          : 'linear-gradient(160deg, #0c0c11, #08080b)',
      }}
    >
      {clip &&
        blobs.map((b, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full blur-2xl"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.r}%`,
              height: `${b.r * 0.7}%`,
              background: `hsl(${210 + i * 18} 45% ${18 + i * 6}%)`,
            }}
            animate={playing ? { x: [0, 14, -8, 0], y: [0, -10, 6, 0] } : { x: 0, y: 0 }}
            transition={{ duration: 9 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

      {/* scanline + vignette: sells "this is a monitor", not "this is a div" */}
      <span className="pointer-events-none absolute inset-0 opacity-[0.16] [background:repeating-linear-gradient(0deg,transparent_0_2px,rgba(255,255,255,0.05)_2px_3px)]" />
      <span className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_120%_at_50%_50%,transparent_45%,rgba(0,0,0,0.6))]" />

      {!clip && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-ink-500">
            no video at playhead
          </span>
        </div>
      )}
    </div>
  )
}

function Meter({ name, gain, playing, index }) {
  const seed = hashSeed(name + index)
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div className="relative w-full flex-1 overflow-hidden rounded-[3px] bg-white/[0.06]">
        <motion.span
          className="absolute inset-x-0 top-0 rounded-[3px]"
          style={{
            background: 'linear-gradient(180deg, #52d4a8, #2b7f66)',
          }}
          animate={
            playing
              ? {
                  height: [
                    `${28 + seededRandom(seed) * 22}%`,
                    `${52 + seededRandom(seed + 3) * 34}%`,
                    `${20 + seededRandom(seed + 7) * 30}%`,
                  ],
                }
              : { height: `${Math.max(8, gain * 26)}%` }
          }
          transition={{ duration: 1.1, repeat: playing ? Infinity : 0, ease: 'easeInOut' }}
        />
      </div>
      <span className="w-full truncate text-center text-[9px] text-ink-500">{name}</span>
    </div>
  )
}

function Inspector({ clip, dispatch, actions }) {
  if (!clip) {
    return (
      <div className="grid h-full place-items-center px-4">
        <p className="max-w-[16ch] text-center text-[11px] leading-relaxed text-ink-500">
          Select a clip to inspect it
        </p>
      </div>
    )
  }

  const rows = [
    ['start', `${clip.start.toFixed(2)}s`],
    ['duration', `${clip.duration.toFixed(2)}s`],
    ['end', `${(clip.start + clip.duration).toFixed(2)}s`],
    ['source in', `${clip.sourceIn.toFixed(2)}s`],
    ['source len', `${clip.sourceDuration.toFixed(2)}s`],
  ]

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div>
        <div className="text-[9.5px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
          Clip
        </div>
        <div className="mt-0.5 truncate text-[12.5px] font-medium text-ink-100">{clip.name}</div>
        <div className="text-[10px] text-ink-500 capitalize">{clip.kind}</div>
      </div>

      <div className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-[11px]">
            <span className="text-ink-500">{k}</span>
            <span className="tabnum font-mono text-ink-200">{v}</span>
          </div>
        ))}
      </div>

      {clip.kind === 'audio' && (
        <div className="space-y-1.5 border-t border-white/[0.07] pt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-ink-500">gain</span>
            <span className="tabnum font-mono text-ink-200">
              {Math.round((clip.gain ?? 1) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1.6}
            step={0.01}
            value={clip.gain ?? 1}
            aria-label="Clip gain"
            onChange={(e) =>
              dispatch(actions.setGain({ id: clip.id, gain: Number(e.target.value) }))
            }
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-peer-2"
          />
        </div>
      )}

      <div className="mt-auto rounded-[6px] border border-white/[0.07] bg-black/30 p-2">
        <p className="text-[10px] leading-relaxed text-ink-500">
          Non-destructive: trimming only moves <span className="text-ink-300">source in</span>, never
          the media itself.
        </p>
      </div>
    </div>
  )
}

export default function Preview({ state, dispatch, actions }) {
  const { tracks, playhead, playing } = state
  const scrubbing = useRef(false)
  const barRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const active = tracks.flatMap((t) =>
    t.clips.filter((c) => playhead >= c.start && playhead < c.start + c.duration).map((c) => ({ clip: c, track: t })),
  )
  const video = active.filter((a) => a.clip.kind === 'video').at(-1)?.clip ?? null
  const overlay = active.filter((a) => a.clip.kind === 'text')
  const audio = active.filter((a) => a.clip.kind === 'audio')
  const selected = selectedClips(tracks, state.selection)[0] ?? null

  const timeFromEvent = useCallback((clientX) => {
    const el = barRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * DURATION
  }, [])

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      scrubbing.current = true
      setDragging(true)
      dispatch(actions.setPlayhead(timeFromEvent(e.clientX)))
    },
    [actions, dispatch, timeFromEvent],
  )
  const onPointerMove = useCallback(
    (e) => scrubbing.current && dispatch(actions.setPlayhead(timeFromEvent(e.clientX))),
    [actions, dispatch, timeFromEvent],
  )
  const onPointerUp = useCallback((e) => {
    scrubbing.current = false
    setDragging(false)
    e?.currentTarget?.releasePointerCapture?.(e.pointerId)
  }, [])

  useEffect(() => () => setDragging(false), [])

  return (
    <section className="grid min-h-0 shrink-0 grid-cols-[1fr_auto_218px] gap-0 border-b border-white/[0.07] bg-ink-900">
      {/* program monitor */}
      <div className="flex min-w-0 flex-col gap-2 p-3">
        <div className="relative aspect-video max-h-[38vh] w-full overflow-hidden rounded-[8px] border border-white/10 bg-black">
          <Frame clip={video} playing={playing} />
          {overlay.map(({ clip }) => (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-[4px] bg-black/45 px-3 py-1 text-[13px] font-medium text-white backdrop-blur-sm"
            >
              {clip.name}
            </motion.div>
          ))}

          {/* HUD */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
            <span className="rounded-[4px] bg-black/50 px-1.5 py-0.5 font-mono text-[9.5px] text-white/70 backdrop-blur-sm">
              {video ? video.name : '—'}
            </span>
            <span className="tabnum rounded-[4px] bg-black/50 px-1.5 py-0.5 font-mono text-[9.5px] text-white/70 backdrop-blur-sm">
              1920×1080 · 30fps
            </span>
          </div>
          <span className="tabnum absolute right-2 bottom-2 rounded-[4px] bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-accent-soft backdrop-blur-sm">
            {playhead.toFixed(2)}s
          </span>
        </div>

        {/* scrub bar */}
        <div
          ref={barRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="slider"
          tabIndex={0}
          aria-label="Preview scrub"
          aria-valuemin={0}
          aria-valuemax={DURATION}
          aria-valuenow={Number(playhead.toFixed(2))}
          className="group relative h-6 cursor-ew-resize select-none"
        >
          <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/[0.08]">
            <span
              className="absolute inset-y-0 left-0 bg-accent/70"
              style={{ width: `${(playhead / DURATION) * 100}%` }}
            />
          </span>
          <motion.span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
            style={{ left: `${(playhead / DURATION) * 100}%` }}
            animate={{ width: dragging ? 14 : 9, height: dragging ? 14 : 9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        </div>
      </div>

      {/* meters */}
      <div className="flex w-24 flex-col gap-2 border-l border-white/[0.06] px-2 py-3">
        <span className="text-center text-[9px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
          Mix
        </span>
        <div className="flex min-h-0 flex-1 gap-1.5">
          {audio.length ? (
            audio.map(({ clip }, i) => (
              <Meter
                key={clip.id}
                name={clip.name.split(' ')[0]}
                gain={clip.gain ?? 1}
                playing={playing}
                index={i}
              />
            ))
          ) : (
            <div className="flex w-full items-end justify-center">
              <span className="mb-1 text-[9px] text-ink-600">silent</span>
            </div>
          )}
        </div>
      </div>

      {/* inspector */}
      <aside className="min-h-0 border-l border-white/[0.06] bg-ink-900/60">
        <Inspector clip={selected} dispatch={dispatch} actions={actions} />
      </aside>
    </section>
  )
}
