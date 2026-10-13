import { motion } from 'framer-motion'
import { hashSeed, seededRandom } from '../lib/geometry.js'

/** Deterministic thumbnail: the clip's own palette, laid out from its id. */
function Thumb({ clip, playing }) {
  const seed = hashSeed(clip.id)
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `linear-gradient(150deg, ${clip.palette[0]}, ${clip.palette[2] ?? clip.palette[1]})`,
      }}
    >
      {Array.from({ length: 3 }).map((_, i) => {
        const a = seededRandom(seed + i * 17)
        const b = seededRandom(seed + i * 29)
        return (
          <span
            key={i}
            className="absolute rounded-full blur-xl"
            style={{
              left: `${a * 70}%`,
              top: `${b * 60}%`,
              width: `${26 + a * 34}%`,
              height: `${30 + b * 30}%`,
              background: clip.palette[i % clip.palette.length],
              opacity: 0.75,
            }}
          />
        )
      })}
      <span className="absolute inset-0 opacity-[0.14] [background:repeating-linear-gradient(0deg,transparent_0_2px,rgba(255,255,255,0.06)_2px_3px)]" />
      {playing && (
        <motion.span
          className="absolute inset-x-0 bottom-0 h-[2px] bg-white/70"
          animate={{ scaleX: [0, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          style={{ originX: 0 }}
        />
      )}
    </div>
  )
}

export default function ResultCard({ item, index, selected, onSelect, onPreview }) {
  const { clip } = item
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(0.28, index * 0.055), type: 'spring', stiffness: 320, damping: 30 }}
      onClick={() => onSelect(clip.id)}
      onMouseEnter={() => onPreview(clip.id)}
      onMouseLeave={() => onPreview(null)}
      className={`group cursor-pointer overflow-hidden rounded-[9px] border bg-ink-850 transition-colors duration-150 ${
        selected ? 'border-accent/50' : 'border-white/[0.07] hover:border-white/15'
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Thumb clip={clip} playing={selected} />

        {/* match score, pinned to the frame like a reviewer's marker */}
        <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-[5px] bg-black/60 px-1.5 py-[3px] backdrop-blur-sm">
          <span
            className="grid h-3.5 w-3.5 place-items-center rounded-[3px] text-[8.5px] font-bold text-ink-950"
            style={{ background: item.accent }}
          >
            {item.rank}
          </span>
          <span className="tabnum font-mono text-[10px] text-white/90">
            {Math.round(item.relevance * 100)}%
          </span>
        </span>

        <span className="absolute top-2 right-2 rounded-[5px] bg-black/60 px-1.5 py-[3px] font-mono text-[9.5px] text-white/75 backdrop-blur-sm">
          {clip.duration.toFixed(1)}s
        </span>

        {/* confidence bar: reads as "how sure", not "how good" */}
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-black/40">
          <motion.span
            className="block h-full"
            style={{ background: item.accent }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: item.confidence }}
            transition={{ delay: 0.1 + index * 0.05, type: 'spring', stiffness: 200, damping: 28 }}
          />
        </span>
      </div>

      <div className="p-2.5">
        <h3 className="truncate text-[12px] font-medium tracking-tight text-ink-100">{clip.name}</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-500">
          <span>{clip.shot}</span>
          <span className="text-ink-700">·</span>
          <span>{clip.lighting}</span>
          <span className="text-ink-700">·</span>
          <span>{clip.motion}</span>
        </p>

        <div className="mt-2 flex flex-wrap gap-1">
          {item.matchedTerms.slice(0, 3).map((term) => (
            <span
              key={term}
              className="rounded-[4px] bg-white/[0.06] px-1.5 py-[1px] font-mono text-[9px] text-ink-300"
            >
              {term}
            </span>
          ))}
          {item.matchedTerms.length > 3 && (
            <span className="px-1 py-[1px] font-mono text-[9px] text-ink-500">
              +{item.matchedTerms.length - 3}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}
