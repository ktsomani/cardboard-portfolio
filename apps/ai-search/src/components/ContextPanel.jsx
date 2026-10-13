import { motion } from 'framer-motion'

function Meter({ value, color = '#52d4a8', label, readout }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10px] text-ink-400">{label}</span>
        <span className="tabnum font-mono text-[10px] text-ink-300">{readout}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }}
          transition={{ type: 'spring', stiffness: 220, damping: 30 }}
        />
      </div>
    </div>
  )
}

function StageList({ stages, stage }) {
  return (
    <ol className="space-y-2.5">
      {stages.map((s, i) => {
        const state = stage > i ? 'done' : stage === i ? 'active' : 'idle'
        return (
          <li key={s.id} className="flex items-start gap-2.5">
            <span className="relative mt-[3px] grid h-4 w-4 shrink-0 place-items-center">
              {state === 'done' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M5 13l4 4L19 8"
                    fill="none"
                    stroke="#52d4a8"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : state === 'active' ? (
                <>
                  <span className="absolute inset-0 rounded-full border border-accent/40" />
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-accent"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-ink-600" />
              )}
            </span>
            <span className="min-w-0">
              <span
                className={`block text-[11.5px] leading-tight ${
                  state === 'idle' ? 'text-ink-500' : 'text-ink-100'
                }`}
              >
                {s.label}
              </span>
              <span className="block text-[10px] text-ink-500">{s.detail}</span>
            </span>
            {state === 'done' && (
              <span className="ml-auto font-mono text-[9.5px] text-peer-2">ok</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function Evidence({ item, selected, onSelect }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      onClick={() => onSelect?.(item.clip.id)}
      className={`cursor-pointer rounded-[8px] border p-2.5 transition-colors duration-150 ${
        selected
          ? 'border-accent/40 bg-accent/[0.07]'
          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="grid h-4 w-4 place-items-center rounded-[4px] text-[9px] font-bold text-ink-950"
          style={{ background: item.accent }}
        >
          {item.rank}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-ink-100">
          {item.clip.name}
        </span>
        <span className="tabnum font-mono text-[10px] text-ink-400">
          {Math.round(item.confidence * 100)}%
        </span>
      </div>

      <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-400">{item.reason}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        {item.evidence.slice(0, 4).map((e, i) => (
          <span
            key={`${e.field}-${e.term}-${i}`}
            className="rounded-[4px] border border-white/[0.07] bg-black/25 px-1.5 py-[1px] font-mono text-[9px] text-ink-300"
          >
            {e.field}:{e.term}
          </span>
        ))}
      </div>

      <div className="mt-2.5">
        <Meter
          value={item.relevance}
          color={item.accent}
          label="relevance"
          readout={item.relevance.toFixed(2)}
        />
      </div>
    </motion.div>
  )
}

export default function ContextPanel({
  open,
  onToggle,
  stages,
  stage,
  payload,
  active,
  selectedId,
  onSelect,
  onClose,
}) {
  const showEvidence = Boolean(payload) && !active

  return (
    <motion.aside
      layout
      initial={false}
      animate={{ width: open ? 344 : 44 }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      className="relative flex shrink-0 flex-col overflow-hidden border-l border-white/[0.07] bg-ink-900/85 backdrop-blur-xl"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? 'Collapse context panel' : 'Expand context panel'}
        className="flex h-11 w-full shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 text-left transition-colors duration-150 hover:bg-white/[0.04]"
      >
        <span className="grid h-5 w-5 shrink-0 place-items-center">
          <motion.svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            animate={{ rotate: open ? 0 : 180 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <path
              d="M9 6l6 6-6 6"
              fill="none"
              stroke="#6c6c7d"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </span>
        <motion.span
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-[9.5px] font-semibold tracking-[0.16em] whitespace-nowrap text-ink-500 uppercase"
        >
          Context
        </motion.span>
      </button>

      {open && (
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          <section className="border-b border-white/[0.06] px-3.5 py-3.5">
            <h3 className="mb-3 text-[9.5px] font-semibold tracking-[0.16em] text-ink-500 uppercase">
              Pipeline
            </h3>
            <StageList stages={stages} stage={stage} />
          </section>

          {payload && (
            <>
              <section className="border-b border-white/[0.06] px-3.5 py-3.5">
                <h3 className="mb-2.5 text-[9.5px] font-semibold tracking-[0.16em] text-ink-500 uppercase">
                  Query analysis
                </h3>
                <div className="mb-3 flex flex-wrap gap-1">
                  {payload.terms.map((term) => (
                    <span
                      key={term}
                      title={
                        payload.variants[term]?.length > 1
                          ? `expanded to: ${payload.variants[term].join(', ')}`
                          : term
                      }
                      className={`rounded-[4px] px-1.5 py-[2px] font-mono text-[9.5px] ${
                        payload.variants[term]?.length > 1
                          ? 'bg-peer-1/15 text-peer-1'
                          : 'bg-white/[0.06] text-ink-300'
                      }`}
                    >
                      {term}
                    </span>
                  ))}
                </div>

                {Object.keys(payload.facets).length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {Object.entries(payload.facets).map(([facet, values]) => (
                      <div key={facet} className="flex items-baseline gap-2 text-[10.5px]">
                        <span className="w-14 shrink-0 text-ink-500">{facet}</span>
                        <span className="text-ink-200">{values.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2.5">
                  <Meter
                    value={payload.coverage}
                    color="#6ea8ff"
                    label="term coverage"
                    readout={`${Math.round(payload.coverage * 100)}%`}
                  />
                  {payload.fieldHits.slice(0, 4).map((f) => (
                    <Meter
                      key={f.field}
                      value={f.count / Math.max(1, payload.results.length)}
                      color="#ff8a6b"
                      label={`matched in ${f.field}`}
                      readout={`${f.count}`}
                    />
                  ))}
                </div>

                <p className="mt-3 font-mono text-[9.5px] text-ink-500">
                  scored locally in {payload.latencyMs} ms · no network call
                </p>
              </section>

              {showEvidence && (
                <section className="border-b border-white/[0.06] px-3.5 py-3.5">
                  <h3 className="mb-2.5 text-[9.5px] font-semibold tracking-[0.16em] text-ink-500 uppercase">
                    Evidence per result
                  </h3>
                  <div className="space-y-2">
                    {payload.results.map((item) => (
                      <Evidence
                        key={item.clip.id}
                        item={item}
                        selected={selectedId === item.clip.id}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </section>
              )}

              {showEvidence && payload.sequence.length > 0 && (
                <section className="px-3.5 py-3.5">
                  <h3 className="mb-2.5 text-[9.5px] font-semibold tracking-[0.16em] text-ink-500 uppercase">
                    Proposed sequence
                  </h3>
                  <div className="relative h-11 overflow-hidden rounded-[6px] border border-white/[0.07] bg-black/30">
                    {payload.sequence.map((s) => (
                      <motion.div
                        key={s.clip.id}
                        initial={{ opacity: 0, scaleY: 0.4 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ delay: 0.05 * s.rank, type: 'spring', stiffness: 300, damping: 26 }}
                        title={`${s.clip.name} @ ${s.incoming.toFixed(1)}s`}
                        className="absolute top-1 bottom-1 origin-bottom overflow-hidden rounded-[3px]"
                        style={{
                          left: `${(s.incoming / 12) * 100}%`,
                          width: `${(s.duration / 12) * 100}%`,
                          background: s.accent,
                        }}
                      >
                        <span className="absolute inset-0 bg-black/35" />
                        <span className="absolute top-0.5 left-1 font-mono text-[8.5px] text-white/90">
                          {s.rank}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-ink-500">
                    Ordered by relevance for a rough assembly — 12s of timeline.
                  </p>
                </section>
              )}
            </>
          )}

          {!payload && !active && (
            <section className="px-3.5 py-4">
              <p className="text-[10.5px] leading-relaxed text-ink-500">
                Run a search to see the query analysis, per-result evidence, and the sequence it
                proposes. Nothing here is generated by a model — it reflects the local scorer.
              </p>
            </section>
          )}
        </div>
      )}

      {open && payload && !active && (
        <footer className="shrink-0 border-t border-white/[0.06] p-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[6px] border border-white/[0.08] bg-white/[0.03] py-1.5 text-[10.5px] font-medium text-ink-300 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white"
          >
            Clear search
          </button>
        </footer>
      )}
    </motion.aside>
  )
}
