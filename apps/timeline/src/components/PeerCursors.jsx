import { motion } from 'framer-motion'

/**
 * Remote cursors, drawn in the top layer with pointer-events off.
 * A cursor that interpolates is what makes presence feel alive rather than
 * teleporting — the label chip gives it a name and an intent.
 */
function Cursor({ peer }) {
  const editing = peer.status === 'editing'
  return (
    <motion.div
      className="pointer-events-none absolute top-0 left-0 z-50 will-change-transform"
      initial={false}
      animate={{ x: peer.x, y: peer.y }}
      transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.6 }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M5.5 2.8 20 10.4l-6.2 1.7-3 6.1L5.5 2.8Z"
          fill={peer.color}
          stroke="#0b0b0f"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="absolute top-4 left-3.5 flex items-center gap-1.5 rounded-full py-[3px] pr-2.5 pl-1.5
          text-[10.5px] font-semibold whitespace-nowrap text-ink-950 shadow-lg"
        style={{ background: peer.color }}
      >
        {peer.name}
        {editing && (
          <motion.span
            className="rounded-full bg-ink-950/25 px-1.5 text-[9px] font-medium"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            editing
          </motion.span>
        )}
      </span>
    </motion.div>
  )
}

export default function PeerCursors({ peers }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {peers.map((peer) => (
        <Cursor key={peer.id} peer={peer} />
      ))}
    </div>
  )
}
