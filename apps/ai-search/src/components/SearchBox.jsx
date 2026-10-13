import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { SUGGESTIONS } from '../data/clips.js'

export default function SearchBox({ value, onChange, onSubmit, active, hasResults, onClear }) {
  const inputRef = useRef(null)

  useEffect(() => {
    // Focus on load: this screen has exactly one primary action.
    inputRef.current?.focus()
  }, [])

  return (
    <div className="border-b border-white/[0.07] bg-ink-900/60 px-4 py-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(value)
        }}
        className="relative"
      >
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-500">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.2" stroke="currentColor" strokeWidth="1.7" />
            <path d="M15.2 15.2 20 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>

        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe the shot you're looking for…"
          aria-label="Search footage"
          spellCheck={false}
          className="h-11 w-full rounded-[9px] border border-white/[0.09] bg-black/40 pr-28 pl-9 text-[12.5px]
            text-ink-100 placeholder:text-ink-500 focus:border-accent/45 focus:outline-none"
        />

        <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5">
          {value && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear"
              className="rounded-[5px] px-1.5 py-1 text-[11px] text-ink-500 transition-colors duration-150 hover:text-ink-200"
            >
              clear
            </button>
          )}
          <button
            type="submit"
            disabled={active || !value.trim()}
            className="flex h-7 items-center gap-1.5 rounded-[6px] bg-accent px-2.5 text-[11px] font-semibold
              text-ink-950 transition-opacity duration-150 hover:opacity-90 disabled:opacity-40"
          >
            {active ? (
              <>
                <motion.span
                  className="h-2.5 w-2.5 rounded-full border-[1.5px] border-ink-950/30 border-t-ink-950"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                />
                searching
              </>
            ) : (
              'Search'
            )}
          </button>
        </span>
      </form>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {hasResults && !active ? (
          <span className="text-[10.5px] text-ink-500">
            Refine the query, or pick a facet on the left to narrow the set.
          </span>
        ) : (
          SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onChange(s)
                onSubmit(s)
              }}
              className="max-w-full truncate rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1
                text-[10.5px] text-ink-400 transition-colors duration-150 hover:bg-white/[0.07] hover:text-ink-100"
            >
              {s}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
