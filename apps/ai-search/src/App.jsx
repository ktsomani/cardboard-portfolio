import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SearchBox from './components/SearchBox.jsx'
import ResultCard from './components/ResultCard.jsx'
import ContextPanel from './components/ContextPanel.jsx'
import RetrievalOrbit from './components/RetrievalOrbit.jsx'
import { useSearchPipeline, STAGES } from './hooks/useSearchPipeline.js'
import { FACETS, TOTAL_CLIPS } from './data/clips.js'

function FacetRail({ filters, onToggle, onClear, resultCount }) {
  return (
    <aside className="scroll-thin hidden w-52 shrink-0 overflow-y-auto border-r border-white/[0.06] bg-ink-900/40 px-3 py-3.5 lg:block">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[9.5px] font-semibold tracking-[0.16em] text-ink-500 uppercase">Filters</h2>
        {Object.values(filters).some((v) => v?.length) && (
          <button
            type="button"
            onClick={onClear}
            className="font-mono text-[9.5px] text-accent transition-opacity duration-150 hover:opacity-80"
          >
            clear filters
          </button>
        )}
      </div>

      <p className="tabnum mb-3 font-mono text-[10px] text-ink-500">
        {resultCount} clip{resultCount === 1 ? '' : 's'} in scope
      </p>

      {FACETS.map((facet) => (
        <div key={facet.id} className="mb-4">
          <h3 className="mb-1.5 text-[10px] font-medium text-ink-400">{facet.label}</h3>
          <div className="flex flex-wrap gap-1">
            {facet.values.map((value) => {
              const on = (filters[facet.id] ?? []).includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onToggle(facet.id, value)}
                  aria-pressed={on}
                  className={`rounded-[5px] border px-1.5 py-[3px] text-[10px] transition-colors duration-150 ${
                    on
                      ? 'border-accent/45 bg-accent/15 text-accent-soft'
                      : 'border-white/[0.07] bg-white/[0.02] text-ink-400 hover:text-ink-200'
                  }`}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </aside>
  )
}

function EmptyState({ onPick }) {
  return (
    <div className="grid h-full place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md text-center"
      >
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-[10px] border border-white/[0.08] bg-white/[0.03]">
          <span className="text-[15px]">◎</span>
        </div>
        <h2 className="text-[14px] font-medium tracking-tight text-ink-100">
          Search footage by describing it
        </h2>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
          Natural language goes in, ranked clips come out — along with exactly which attributes
          matched. Try one of these:
        </p>
        <div className="mt-4 flex flex-col gap-1.5">
          {[
            'robot arm moving slowly in a dark room',
            'hands typing under cold monitor light',
            'wide dusk skyline with warm haze',
          ].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="rounded-[7px] border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-left text-[11.5px]
                text-ink-300 transition-colors duration-150 hover:border-white/15 hover:text-ink-100"
            >
              {s}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default function App() {
  const {
    query,
    setQuery,
    submitted,
    filters,
    toggleFilter,
    clearFilters,
    active,
    stage,
    payload,
    visibleCount,
    run,
    reset,
  } = useSearchPipeline()

  const [view, setView] = useState('grid')
  const [selectedId, setSelectedId] = useState(null)
  const [previewId, setPreviewId] = useState(null)
  const [panelOpen, setPanelOpen] = useState(true)

  const results = payload?.results ?? []
  const shown = useMemo(() => results.slice(0, visibleCount || results.length), [results, visibleCount])

  /**
   * Scope count for the rail. Before a search there is no result set, so the
   * honest answer is the corpus size; after one, it is the filtered result count.
   */
  const resultCount = payload ? results.length : TOTAL_CLIPS

  const onSubmit = (text) => {
    const value = text ?? query
    setSelectedId(null)
    run(value)
  }

  return (
    <div className="flex h-full overflow-hidden bg-ink-950">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/[0.07] bg-ink-900/70 px-4">
          <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-accent text-[10px] font-black text-ink-950">
            F
          </span>
          <div className="leading-tight">
            <div className="text-[12px] font-semibold tracking-tight text-ink-100">
              Footage Search
            </div>
            <div className="font-mono text-[9.5px] text-ink-500">
              multimodal retrieval · context dashboard
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-[7px] border border-white/[0.07] bg-white/[0.03] p-0.5">
              {['grid', 'space'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`relative rounded-[5px] px-2.5 py-1 text-[10.5px] font-medium capitalize transition-colors duration-150 ${
                    view === v ? 'text-white' : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  {view === v && (
                    <motion.span
                      layoutId="view-pill"
                      className="absolute inset-0 rounded-[5px] bg-white/[0.09]"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    />
                  )}
                  <span className="relative">{v}</span>
                </button>
              ))}
            </div>
            <span className="hidden font-mono text-[10px] text-ink-500 xl:inline">
              {results.length} results
            </span>
          </div>
        </header>

        <SearchBox
          value={query}
          onChange={setQuery}
          onSubmit={onSubmit}
          active={active}
          hasResults={Boolean(payload)}
          onClear={() => {
            setQuery('')
            reset()
          }}
        />

        <div className="flex min-h-0 flex-1">
          <FacetRail
            filters={filters}
            onToggle={toggleFilter}
            onClear={clearFilters}
            resultCount={resultCount}
          />

          <main className="relative min-w-0 flex-1 overflow-hidden">
            {!payload ? (
              <EmptyState
                onPick={(s) => {
                  setQuery(s)
                  onSubmit(s)
                }}
              />
            ) : view === 'space' ? (
              <div className="h-full w-full">
                <RetrievalOrbit
                  results={results}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
                <div className="pointer-events-none absolute bottom-3 left-3 max-w-xs">
                  <span className="rounded-full border border-white/[0.08] bg-black/45 px-2.5 py-1 text-[10px] text-ink-400 backdrop-blur-md">
                    distance = match strength · brightness = lighting · click a node for its evidence
                  </span>
                </div>
              </div>
            ) : (
              <div className="scroll-thin h-full overflow-y-auto p-4">
                {shown.length === 0 && !active ? (
                  <div className="grid h-full place-items-center">
                    <p className="max-w-xs text-center text-[11.5px] leading-relaxed text-ink-500">
                      No clips match this query with the current filters. Try removing a facet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(212px,1fr))] gap-3">
                    {shown.map((item, i) => (
                      <ResultCard
                        key={item.clip.id}
                        item={item}
                        index={i}
                        selected={selectedId === item.clip.id || previewId === item.clip.id}
                        onSelect={setSelectedId}
                        onPreview={setPreviewId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>

          <ContextPanel
            open={panelOpen}
            onToggle={() => setPanelOpen((v) => !v)}
            stages={STAGES}
            stage={stage}
            payload={payload}
            active={active}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onClose={() => {
              setQuery('')
              reset()
            }}
          />
        </div>
      </div>
    </div>
  )
}
