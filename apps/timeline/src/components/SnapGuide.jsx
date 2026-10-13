import { motion } from 'framer-motion'
import { formatTime } from '../lib/utils.js'

const KIND_COPY = {
  grid: 'grid',
  clip: 'clip edge',
  playhead: 'playhead',
}

/**
 * Vertical guide shown while a snap is active, plus a readout of the time it
 * snapped to. Guides fade rather than pop, so fast drags do not strobe.
 */
export default function SnapGuide({ guide, pxPerSec, height }) {
  if (!guide || guide.guide === null) return null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="pointer-events-none absolute top-0 z-30"
      style={{ left: guide.guide * pxPerSec, height }}
    >
      <span
        className={`absolute top-0 h-full w-px ${
          guide.kind === 'playhead' ? 'bg-accent/70' : 'bg-peer-1/80'
        }`}
      />
      <span
        className="tabnum absolute top-1 left-1 rounded-[4px] px-1.5 py-0.5 font-mono text-[9.5px] whitespace-nowrap
          text-ink-950 shadow-lg"
        style={{ background: guide.kind === 'playhead' ? '#ff8a6b' : '#6ea8ff' }}
      >
        {formatTime(guide.guide)}
        <span className="ml-1 opacity-60">{KIND_COPY[guide.kind] ?? ''}</span>
      </span>
    </motion.div>
  )
}
