import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  CopyIcon,
  MagnetIcon,
  PauseIcon,
  PlayIcon,
  RedoIcon,
  RippleIcon,
  ScissorsIcon,
  SkipEndIcon,
  SkipStartIcon,
  TrashIcon,
  UndoIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './Icons.jsx'
import { formatTime } from '../lib/utils.js'
import { DURATION, totalClipCount } from '../store.jsx'

/** A quiet, reusable button: hairline border, 150ms hover, pressed inset. */
export function ToolButton({
  children,
  label,
  onClick,
  active = false,
  disabled = false,
  hint,
  tone = 'default',
  className = '',
}) {
  const tones = {
    default: 'text-ink-200 hover:text-white hover:bg-white/[0.07]',
    danger: 'text-ink-300 hover:text-red-300 hover:bg-red-500/[0.12]',
    accent: 'text-accent hover:bg-accent/15',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active || undefined}
      title={hint ? `${label} · ${hint}` : label}
      className={`group relative inline-flex h-8 items-center justify-center gap-1.5 rounded-[7px] px-2.5
        text-[12px] font-medium tracking-tight transition-colors duration-150
        disabled:pointer-events-none disabled:opacity-35
        ${active ? 'bg-white/[0.09] text-white' : tones[tone]}
        ${className}`}
    >
      {children}
      {active && (
        <motion.span
          layoutId="toolbar-active"
          className="pointer-events-none absolute inset-0 rounded-[7px] ring-1 ring-white/15"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
    </button>
  )
}

const Divider = () => <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />

function Presence({ peers }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {peers.map((peer) => (
          <motion.span
            key={peer.id}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            title={`${peer.name} · ${peer.status}`}
            className="relative grid h-6 w-6 place-items-center rounded-full text-[9.5px] font-semibold
              text-ink-950 ring-2 ring-ink-900"
            style={{ background: peer.color }}
          >
            {peer.initials}
            {peer.status === 'editing' && (
              <motion.span
                className="absolute -inset-0.5 rounded-full"
                style={{ boxShadow: `0 0 0 2px ${peer.color}55` }}
                animate={{ opacity: [0.9, 0.25, 0.9] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </motion.span>
        ))}
      </div>
      <span className="hidden text-[11px] text-ink-400 xl:inline">
        {peers.length + 1} in this project
      </span>
    </div>
  )
}

export default function Toolbar({ state, dispatch, actions, peers, onSplitFailure, onBack }) {
  const { playing, playhead, pxPerSec, snapEnabled, rippleEnabled, selection, tracks } = state
  const clips = totalClipCount(tracks)

  return (
    <header className="relative z-30 flex flex-col border-b border-white/[0.07] bg-ink-900/80 backdrop-blur-xl">
      <div className="flex h-12 items-center gap-3 px-3">
        {/* identity */}
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to portfolio"
            className="grid h-7 w-7 place-items-center rounded-[7px] text-ink-400 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white"
          >
            <ArrowLeftIcon size={15} />
          </button>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-accent text-[11px] font-black text-ink-950">
              C
            </span>
            <div className="leading-tight">
              <div className="text-[12.5px] font-semibold tracking-tight text-ink-100">
                {state.projectName}
              </div>
              <div className="tabnum text-[10px] text-ink-500">
                {clips} clips · {DURATION}s · 30fps
              </div>
            </div>
          </div>
        </div>

        <Divider />

        <Presence peers={peers} />

        {/* transport */}
        <div className="mx-auto flex items-center gap-1">
          <ToolButton label="Go to start" hint="Home" onClick={() => dispatch(actions.setPlayhead(0))}>
            <SkipStartIcon />
          </ToolButton>
          <ToolButton
            label={playing ? 'Pause' : 'Play'}
            hint="Space"
            onClick={() => dispatch(actions.togglePlay())}
            className="!h-8 !w-9 !px-0"
          >
            <motion.span
              key={playing ? 'pause' : 'play'}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.14 }}
            >
              {playing ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
            </motion.span>
          </ToolButton>
          <ToolButton
            label="Go to end"
            hint="End"
            onClick={() => dispatch(actions.setPlayhead(DURATION))}
          >
            <SkipEndIcon />
          </ToolButton>
        </div>

        <div className="tabnum rounded-[7px] border border-white/[0.08] bg-black/40 px-2.5 py-1 font-mono text-[12.5px] text-ink-100">
          {formatTime(playhead)}
          <span className="ml-1.5 text-[10.5px] text-ink-500">/ {formatTime(DURATION)}</span>
        </div>

        <Divider />

        {/* clip operations */}
        <div className="flex items-center gap-0.5">
          <ToolButton label="Undo" hint="⌘Z" disabled={!state.past.length} onClick={() => dispatch(actions.undo())}>
            <UndoIcon />
          </ToolButton>
          <ToolButton label="Redo" hint="⇧⌘Z" disabled={!state.future.length} onClick={() => dispatch(actions.redo())}>
            <RedoIcon />
          </ToolButton>
          <Divider />
          <ToolButton
            label="Split at playhead"
            hint="S"
            disabled={!clips}
            onClick={() => dispatch(actions.splitAtPlayhead(onSplitFailure))}
          >
            <ScissorsIcon />
          </ToolButton>
          <ToolButton
            label="Duplicate"
            hint="⌘D"
            disabled={!selection.length}
            onClick={() => dispatch(actions.duplicateSelection())}
          >
            <CopyIcon />
          </ToolButton>
          <ToolButton
            label="Delete"
            hint="⌫"
            tone="danger"
            disabled={!selection.length}
            onClick={() => dispatch(actions.deleteSelection())}
          >
            <TrashIcon />
          </ToolButton>
        </div>
      </div>

      {/* second row: feel controls */}
      <div className="flex h-10 items-center gap-2 border-t border-white/[0.05] px-3">
        <ToolButton
          label="Snapping"
          hint="Alt bypasses while dragging"
          active={snapEnabled}
          onClick={() => dispatch(actions.toggleSnap())}
        >
          <MagnetIcon size={14} />
          <span className="hidden sm:inline">Snap</span>
        </ToolButton>
        <ToolButton
          label="Ripple delete"
          hint="Close the gap on delete"
          active={rippleEnabled}
          onClick={() => dispatch(actions.toggleRipple())}
        >
          <RippleIcon size={14} />
          <span className="hidden sm:inline">Ripple</span>
        </ToolButton>

        <Divider />

        <div className="flex items-center gap-0.5">
          <ToolButton label="Zoom out" onClick={() => dispatch(actions.setZoom(pxPerSec / 1.25))}>
            <ZoomOutIcon size={14} />
          </ToolButton>
          <ToolButton label="Zoom in" onClick={() => dispatch(actions.setZoom(pxPerSec * 1.25))}>
            <ZoomInIcon size={14} />
          </ToolButton>
        </div>
        <input
          type="range"
          min={18}
          max={260}
          step={1}
          value={pxPerSec}
          aria-label="Timeline zoom"
          onChange={(e) => dispatch(actions.setZoom(Number(e.target.value)))}
          className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-white/15 accent-accent
            [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
        />
        <span className="tabnum w-14 text-[10.5px] text-ink-500">
          {Math.round(pxPerSec)} px/s
        </span>

        <div className="ml-auto flex items-center gap-3 text-[10.5px] text-ink-500">
          <span className="hidden md:inline">
            Drag clips · edges to trim · <kbd className="text-ink-300">Alt</kbd> bypasses snap
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-peer-2" />
            local session
          </span>
        </div>
      </div>
    </header>
  )
}
