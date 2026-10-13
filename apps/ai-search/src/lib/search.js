import { CLIPS, FIELD_WEIGHTS } from '../data/clips.js'

/**
 * A small, honest lexical retriever.
 *
 * This is NOT a model. It is bag-of-words scoring with field weights, plus a
 * handful of colour/tone synonyms so that natural phrasing ("dark", "cold",
 * "calm") lines up with the vocabulary actually stored on each clip. The point
 * of the demo is the *interface* around retrieval — the reasoning panel shows
 * exactly which terms matched which fields, which is the thing I would want a
 * real embedding search to expose too.
 */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'with', 'where', 'when',
  'that', 'this', 'is', 'are', 'was', 'be', 'it', 'its', 'for', 'find', 'show', 'me',
  'get', 'clip', 'clips', 'shot', 'shots', 'scene', 'scenes', 'footage', 'something',
  'some', 'any', 'there', 'here', 'into', 'as', 'by', 'from', 'very', 'under', 'over',
  'moves', 'moving', 'move', 'background', 'foreground', 'looking', 'looks', 'like',
  'about', 'around', 'kind', 'sort', 'thing', 'things', 'them', 'they', 'then', 'than',
])

/** Phrasing people actually use -> vocabulary stored on the clips. */
const SYNONYMS = {
  dark: ['dark', 'shadow', 'night', 'low key', 'lowkey', 'black'],
  bright: ['bright', 'high key', 'highkey', 'clean', 'light'],
  cold: ['cold', 'cool', 'blue', 'teal'],
  warm: ['warm', 'golden', 'orange', 'amber'],
  calm: ['calm', 'slow', 'static', 'peaceful', 'gentle'],
  energy: ['energy', 'fast', 'quick', 'racing', 'dynamic'],
  slow: ['slow', 'gentle', 'calm'],
  fast: ['fast', 'quick', 'racing'],
  night: ['night', 'dark', 'low key'],
  indoor: ['interior', 'desk', 'studio', 'room'],
  outdoor: ['exterior', 'nature', 'forest', 'ocean', 'skyline', 'rooftop'],
  hands: ['hands', 'fingers', 'typing'],
  city: ['city', 'skyline', 'urban'],
}

/** Facet vocabularies used both for query intent detection and for filtering. */
const FACET_VOCAB = {
  lighting: ['Low key', 'High key', 'Warm practical', 'Cool LED', 'Daylight', 'Golden hour', 'Dappled', 'Even'],
  motion: ['Slow', 'Medium', 'Fast', 'Static', 'Dolly', 'Handheld', 'Drift', 'Walk', 'Timelapse'],
  shot: ['Close-up', 'Medium', 'Wide', 'Aerial', 'Macro', 'Overhead'],
}

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
}

/** Expands a query token into the set of vocabulary terms it should match. */
export function expand(token) {
  const extra = SYNONYMS[token]
  return extra ? [token, ...extra] : [token]
}

/** Field text as a single lowercase string; tags joined. */
function fieldText(clip, field) {
  if (field === 'tags') return clip.tags.join(' ')
  return String(clip[field] ?? '')
}

function matchesFilters(clip, filters) {
  for (const [facet, values] of Object.entries(filters)) {
    if (!values?.length) continue
    if (!values.includes(clip[facet])) return false
  }
  return true
}

/**
 * Substring matching is what makes this cheap, but it also makes "no" match
 * inside "robot". Accept a hit only when the evidence is long enough to be
 * meaningful, so junk queries return nothing instead of noise.
 */
function isMeaningfulHit(term, matched) {
  return matched.length >= 3 && (term.length >= 3 || matched.length >= 5)
}

/** Turn the strongest evidence into a sentence a human would accept. */
function buildReason(result) {
  const { evidence, clip, distinctFields } = result
  if (!evidence.length) return 'Weak match on the indexed text.'

  const strongest = evidence[0]
  const others = evidence.slice(1).filter((e) => e.field !== strongest.field)
  const descriptor = [clip.lighting, clip.motion].filter(Boolean).join(', ').toLowerCase()

  const head = `Matched "${strongest.term}" in ${strongest.field}`
  const tail = others.length
    ? `, corroborated in ${others.slice(0, 2).map((e) => e.field).join(' and ')}`
    : ''
  const span = distinctFields >= 3 ? ' — evidence spans several attributes' : ''
  return `${head}${tail}${span}. ${descriptor ? `Reads as ${descriptor}.` : ''}`.trim()
}

/**
 * @returns {{
 *   results: Array<object>,
 *   terms: string[],
 *   variants: Record<string, string[]>,
 *   facets: Record<string, string[]>,
 *   fieldHits: Array<{field:string, count:number}>,
 *   latencyMs: number,
 *   coverage: number
 * }}
 */
export function search(query, { corpus = CLIPS, filters = {} } = {}) {
  const started = performance.now()

  const rawTerms = tokenize(query)
  const variants = {}
  for (const term of rawTerms) variants[term] = expand(term)

  // Detected facet values straight from the query text.
  const facets = {}
  for (const term of rawTerms) {
    for (const [facet, values] of Object.entries(FACET_VOCAB)) {
      const hit = values.find(
        (v) => v.toLowerCase().includes(term) || term.includes(v.toLowerCase()),
      )
      if (hit) facets[facet] = [...new Set([...(facets[facet] ?? []), hit])]
    }
  }

  const scored = corpus
    .filter((clip) => matchesFilters(clip, filters))
    .map((clip) => {
      let score = 0
      const evidence = []
      const matchedTerms = new Set()

      for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
        const haystack = fieldText(clip, field).toLowerCase()
        if (!haystack) continue

        for (const term of rawTerms) {
          const found = variants[term].find((candidate) => haystack.includes(candidate))
          if (found && isMeaningfulHit(term, found)) {
            // Longer stored matches are stronger evidence than a 3-letter hit.
            const gain = 1 + Math.min(0.6, found.length / 24)
            score += gain * weight
            matchedTerms.add(term)
            evidence.push({ field, term, matched: found, weight })
          }
        }
      }

      // Reward evidence that spans several fields: "slow" in motion *and* visual
      // is a much better match than "slow" three times inside one description.
      const distinctFields = new Set(evidence.map((e) => e.field)).size
      if (distinctFields > 1) score *= 1 + Math.min(0.45, (distinctFields - 1) * 0.12)

      return {
        clip,
        score,
        evidence: evidence.sort((a, b) => b.weight - a.weight).slice(0, 6),
        matchedTerms: [...matchedTerms],
        distinctFields,
      }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.clip.name.localeCompare(b.clip.name))

  const top = scored[0]?.score ?? 1
  const results = scored.map((r, index) => ({
    ...r,
    rank: index + 1,
    relevance: Math.max(0.08, Math.min(1, r.score / top)),
    confidence: Math.max(0.1, Math.min(0.98, 0.32 + (r.score / top) * 0.62)),
    accent: r.clip.palette[1],
    reason: buildReason(r),
  }))

  // Count hits per field across the whole result set, for the context panel.
  const perField = new Map()
  for (const r of results) {
    for (const e of r.evidence) perField.set(e.field, (perField.get(e.field) ?? 0) + 1)
  }
  const fieldHits = [...perField].map(([field, count]) => ({ field, count }))
  fieldHits.sort((a, b) => b.count - a.count)

  const coveredTerms = new Set(results.flatMap((r) => r.matchedTerms))
  // Honest timing: the measured cost of the local scoring pass above, not a
  // simulated network round-trip.
  const latencyMs = Math.round((performance.now() - started) * 100) / 100

  return {
    results,
    terms: rawTerms,
    variants,
    facets,
    fieldHits,
    latencyMs,
    coverage: rawTerms.length ? coveredTerms.size / rawTerms.length : 0,
  }
}

/** Compose found clips into a rough edit order — the bridge back to the timeline. */
export function suggestSequence(results) {
  return results.slice(0, 5).map((r, i) => ({
    ...r,
    incoming: i * 2.5,
    duration: Math.min(r.clip.duration, 3.2),
  }))
}
