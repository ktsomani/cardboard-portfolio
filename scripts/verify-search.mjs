// Scratch probe for the retrieval engine. Run: node scripts/verify-search.mjs
import { search } from '../apps/ai-search/src/lib/search.js'

const queries = [
  'find the scene where the robot arm moves slowly and the background is dark',
  'hands typing under cold monitor light',
  'wide establishing shots at dusk with warm haze',
  'something calm and blue for the opening',
  'fast energy for the launch beat',
  'zzzz nonsense query with no matches',
]

let failures = 0

for (const q of queries) {
  const r = search(q)
  console.log('\nQ:', q)
  console.log('  terms   :', r.terms.join(', '))
  console.log('  facets  :', JSON.stringify(r.facets))
  console.log('  coverage:', r.coverage.toFixed(2), ' latency:', r.latencyMs, 'ms')
  r.results.slice(0, 3).forEach((x) =>
    console.log(
      '   #' + x.rank, x.clip.name.padEnd(30),
      'rel=' + x.relevance.toFixed(2),
      'conf=' + x.confidence.toFixed(2),
    ),
  )
  if (!r.results.length) console.log('   (no results)')
  if (q.startsWith('zzzz') && r.results.length) {
    console.log('   !! expected no results for nonsense query')
    failures += 1
  }
}

// Deterministic ranking check: 'slow' must surface the slow-motion clips.
const slow = search('slow movement')
const slowNames = slow.results.map((r) => r.clip.name)
console.log('\nslow query top 4:', slowNames.slice(0, 4))
if (!slowNames[0].includes('slow')) {
  console.log('!! expected a slow-motion clip first')
  failures += 1
}

console.log('\nFAILURES:', failures)
