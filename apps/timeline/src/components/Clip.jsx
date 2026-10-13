import { memo } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { hashSeed, seededRandom } from '../lib/utils.js'

const KIND_STYLES = {
  video: {
    from: '#2b3b57',
    to: '#16202f',
    ring: '#6ea8ff',
    label: 'V',
  },
  audio: {
    from: '#1e4038',
    to: '#12241f',
    ring: '#52d4a8',
    label: 'A',
  },
  text: {
    from: '#4a3a1e',
    to: '#2a2012',
    ring: '#ffb454',
    label: 'T',
  },
  adjustment: {
    from: '#3a2a4e',
    to: '#221834',
    ring: '#c084fc',
    label: 'FX',
  },
}

/** Deterministic film-strip: same clip always looks the same. */
function FilmStrip({ seed, width }) {
  const frames = Math.max(2, Math.round(width / 34))
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[62%] gap-px overflow-hidden opacity-[0.5]">
      {Array.from({ length: frames }).map((_, i) => {
        const a = seededRandom(seed + i * 7)
        const b = seededRandom(seed + i * 13)
        return (
          <div
            key={i}
            className="relative flex-1"
            style={{
              background: `linear-gradient(140deg,
                hsl(${Math.round(200 + a * 40)} 30% ${Math.round(22 + b * 26)}%),
                hsl(${Math.round(210 + b * 30)} 34% ${Math.round(12 + a * 18)}%))`,
            }}
          >
            <span
              className="absolute rounded-full bg-white/10"
              style={{
                left: `${18 + a * 40}%`,
                top: `${12 + b * 46}%`,
                width: `${10 + b * 22}%`,
                height: `${10 + a * 20}%`,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

/** Audio waveform: deterministic bars, amplitude tinted by clip gain. */
function Waveform({ seed, width, gain = 1 }) {
  const bars = Math.max(6, Math.round(width / 4))
  const center = 50
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] w-full"
      preserveAspectRatio="none"
      viewBox={`0 0 ${bars * 4} 100`}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => {
        const env = 0.35 + 0.65 * Math.abs(Math.sin((i / bars) * Math.PI * 1.7 + seed % 10))
        const noise = 0.35 + seededRandom(seed + i * 3) * 0.65
        const h = Math.min(92, env * noise * 90 * (0.45 + gain * 0.55))
        return (
          <rect
            key={i}
            x={i * 4 + 1}
            y={center - h / 2}
            width={2}
            height={h}
            rx={1}
            fill="currentColor"
            opacity={0.34 + gain * 0.4}
          />
        )
      })}
    </svg>
  )
}

function ClipComponent({
  clip,
  trackId,
  pxPerSec,
  selected,
  active,
  remoteBy,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  const style = KIND_STYLES[clip.kind] ?? KIND_STYLES.video
  const width = Math.max(6, clip.duration * pxPerSec)
  const left = clip.start * pxPerSec
  const seed = hashSeed(clip.id)

  return (
    <motion.div
      data-clip={clip.id}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ opacity: { duration: 0.18 } }}
      style={{
        left,
        width,
        background: `linear-gradient(180deg, ${style.from}, ${style.to})`,
        touchAction: 'none',
        // Remote edits get a halo in the peer's colour; local ones get accent.
        boxShadow: selected
          ? `0 0 0 1.5px ${style.ring}, 0 8px 24px -8px ${style.ring}99`
          : remoteBy
            ? `0 0 0 1.5px ${remoteBy.color}cc, 0 0 22px -4px ${remoteBy.color}88`
            : '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 6px 16px -12px black',
      }}
      className={`group absolute inset-y-0 my-0.5 overflow-hidden rounded-[5px] text-ink-100
        ${dragging ? 'z-20 cursor-grabbing' : 'cursor-grab'}
        ${selected ? 'z-10' : 'z-0'}`}
    >
      {clip.kind === 'video' && <FilmStrip seed={seed} width={width} />}
      {clip.kind === 'audio' && (
        <span className="absolute inset-0 text-peer-2">
          <Waveform seed={seed} width={width} gain={clip.gain ?? 1} />
        </span>
      )}
      {clip.kind === 'text' && (
        <span
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, #ffb454 0 6px, transparent 6px 12px)',
          }}
        />
      )}
      {clip.kind === 'adjustment' && (
        <span className="pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(45deg,#c084fc_0_5px,transparent_5px_11px)]" />
      )}

      {/* header */}
      <div className="relative flex h-[22px] items-center gap-1.5 px-1.5">
        <span
          className="grid h-3.5 shrink-0 place-items-center rounded-[3px] px-1 text-[8.5px] font-bold text-ink-950"
          style={{ background: style.ring }}
        >
          {style.label}
        </span>
        <span className="truncate text-[11px] font-medium leading-none tracking-tight text-white/95">
          {clip.name}
        </span>
      </div>

      {/* duration readout, only where there is room */}
      {width > 108 && (
        <span className="tabnum absolute bottom-1 left-1.5 font-mono text-[9.5px] text-white/45">
          {clip.duration.toFixed(2)}s
        </span>
      )}
      {width > 150 && (
        <span className="absolute right-1.5 bottom-1 font-mono text-[9.5px] text-white/30">
          in {clip.sourceIn.toFixed(2)}
        </span>
      )}

      {/* active-at-playhead wash */}
      {active && (
        <span className="pointer-events-none absolute inset-0 bg-white/[0.07] ring-1 ring-white/10 ring-inset" />
      )}

      {/* trim affordances */}
      {!dragging && (
        <>
          <span
            onPointerDown={(e) => onPointerDown(e, 'left')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute inset-y-0 left-0 z-10 w-2.5 cursor-ew-resize opacity-0 transition-opacity
              duration-150 group-hover:opacity-100"
          >
            <span className="absolute inset-y-1 left-[3px] w-[2px] rounded-full bg-white/70" />
          </span>
          <span
            onPointerDown={(e) => onPointerDown(e, 'right')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute inset-y-0 right-0 z-10 w-2.5 cursor-ew-resize opacity-0 transition-opacity
              duration-150 group-hover:opacity-100"
          >
            <span className="absolute inset-y-1 right-[3px] w-[2px] rounded-full bg-white/70" />
          </span>
        </>
      )}
    </motion.div>
  )
}

/**
 * Clip position is plain inline `left`/`width` in pixels.
 *
 * Deliberately NOT using Framer's `layout` here: it re-measures every clip on
 * every frame the tree re-renders, and during playback the playhead updates at
 * 60fps across 17 clips. Absolute positioning from time values is both faster
 * and more correct for an NLE — a dragged clip should track the cursor exactly,
 * not spring toward it.
 */
export default memo(ClipComponent)
export { KIND_STYLES }
