import { AnimatePresence, motion } from 'framer-motion'

/**
 * Remote activity log. In a real session this would be a server event stream;
 * here it is fed by the simulated peers so the *information design* of remote
 * edits can be judged (who, what, where, when).
 */
export default function ActivityFeed({ items }) {
  return (
    <div className="pointer-events-none absolute bottom-9 left-3 z-40 w-64">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="mb-1.5 flex items-center gap-2 rounded-[7px] border border-white/[0.08] bg-ink-850/90 px-2.5 py-1.5 backdrop-blur-md"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: item.color ?? '#6ea8ff' }}
            />
            <span className="min-w-0 flex-1 truncate text-[11px] text-ink-200">
              <span className="font-medium text-ink-100">{item.peerName}</span> {item.verb}{' '}
              <span className="text-ink-300">{item.detail}</span>
              {item.to && <span className="tabnum font-mono text-ink-500"> → {item.to}</span>}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
