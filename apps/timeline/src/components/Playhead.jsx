import { memo } from 'react'
import { motion } from 'framer-motion'
import { formatTime } from '../lib/utils.js'

/**
 * The playhead is deliberately the loudest thing on a dark timeline: a 1px
 * accent line with a grab handle in the ruler. Its left offset is driven by
 * state, so during playback it is the only part of the lanes that updates.
 */
function PlayheadComponent({ time, pxPerSec, height, playing, onScrubStart }) {
  return (
    <motion.div
      className="group pointer-events-none absolute top-0 z-40"
      style={{ left: time * pxPerSec, height }}
    >
      <span
        className="absolute top-0 h-full w-px"
        style={{
          background: 'linear-gradient(180deg, #ff5c38, #ff5c3855)',
          boxShadow: '0 0 12px -2px #ff5c38aa',
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onPointerDown={onScrubStart}
        className="pointer-events-auto absolute -top-3 -left-[7px] grid h-6 w-4 cursor-ew-resize place-items-center"
      >
        <span className="h-3 w-3 rotate-45 rounded-[2px] bg-accent shadow-[0_0_10px_-1px_#ff5c38]" />
      </button>
      {playing && (
        <motion.span
          className="absolute top-0 h-full w-px bg-accent/40"
          animate={{ opacity: [0, 0.7, 0], scaleX: [1, 3, 1] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <span className="tabnum absolute top-7 left-1.5 rounded-[3px] bg-accent px-1 font-mono text-[9px] font-semibold text-ink-950 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {formatTime(time)}
      </span>
    </motion.div>
  )
}

export default memo(PlayheadComponent)
