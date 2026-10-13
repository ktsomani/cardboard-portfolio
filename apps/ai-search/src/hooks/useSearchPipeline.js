/**
 * Live query → results pipeline.
 *
 * A real system would stream tokens from a server. Here the "stages" are a
 * timed choreography around a real local scoring pass, so the *information
 * design* (what the user is told, and when) can be judged without pretending
 * there is a backend. The scores are genuine; only their reveal is staged.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { search, suggestSequence } from '../lib/search.js'

export const STAGES = [
  { id: 'parse', label: 'Parsing query', detail: 'extracting intent and attributes' },
  { id: 'scan', label: 'Scanning index', detail: 'visual + audio + shot metadata' },
  { id: 'rank', label: 'Ranking candidates', detail: 'weighting evidence per field' },
  { id: 'plan', label: 'Planning sequence', detail: 'ordering for the edit' },
]

const STAGE_MS = [380, 540, 660, 400]

export function useSearchPipeline() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [filters, setFilters] = useState({})
  const [active, setActive] = useState(false)
  const [stage, setStage] = useState(-1)
  const [payload, setPayload] = useState(null)
  const [visibleCount, setVisibleCount] = useState(0)

  const timers = useRef([])
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const start = useCallback(
    (text, filterOverride) => {
      const trimmed = text.trim()
      if (!trimmed) return

      clearTimers()
      setSubmitted(trimmed)
      setActive(true)
      setStage(0)
      setVisibleCount(0)
      setPayload(null)

      // The real scoring pass, plus the derived sequence.
      const result = search(trimmed, { filters: filterOverride ?? filtersRef.current })
      const sequence = suggestSequence(result.results)

      let elapsed = 0
      STAGES.forEach((_, i) => {
        elapsed += STAGE_MS[i]
        timers.current.push(
          window.setTimeout(() => {
            setStage(i)
            // Reveal progressively so ranking reads as considered, not dumped.
            if (i === 2) setVisibleCount(Math.min(2, result.results.length))
            if (i === 3) setVisibleCount(result.results.length)
          }, elapsed),
        )
      })

      timers.current.push(
        window.setTimeout(() => {
          setPayload({ ...result, sequence })
          setActive(false)
          setStage(STAGES.length)
          setVisibleCount(result.results.length)
        }, elapsed + 200),
      )
    },
    [clearTimers],
  )

  const run = useCallback((text) => start(text, filtersRef.current), [start])

  /**
   * Toggling a facet re-runs the same query through the pipeline.
   *
   * The next filter set is computed OUTSIDE the state updater. Calling start()
   * from inside a setState updater means setState runs during render, which
   * React reports as "Cannot update a component while rendering a different
   * component". `filters` is read directly because this callback is recreated
   * whenever it changes.
   */
  const toggleFilter = useCallback(
    (facet, value) => {
      const current = filters[facet] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      const merged = { ...filters, [facet]: next }
      setFilters(merged)
      if (submitted) start(submitted, merged)
    },
    [filters, start, submitted],
  )

  const clearFilters = useCallback(() => {
    setFilters({})
    if (submitted) start(submitted, {})
  }, [start, submitted])

  const reset = useCallback(() => {
    clearTimers()
    setSubmitted('')
    setPayload(null)
    setActive(false)
    setStage(-1)
    setVisibleCount(0)
    setFilters({})
  }, [clearTimers])

  return {
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
  }
}
