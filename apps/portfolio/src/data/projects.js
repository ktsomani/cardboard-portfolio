/**
 * Portfolio content.
 *
 * `profile` holds the real contact details. Everything else describes the three
 * demos in this monorepo, and the status fields are deliberately honest about
 * what is driven locally versus what would need a backend.
 */

export const profile = {
  name: 'Kartik Somani',
  role: 'Design Engineer',
  location: 'Bengaluru · relocation ready',
  email: 'kartik.somani500@gmail.com',
  tagline:
    'I build interfaces where the motion, the rendering and the state model are the product — not a finish applied at the end.',
  links: [
    { label: 'GitHub', href: 'https://github.com/ktsomani', kind: 'code' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/kartik-somani', kind: 'doc' },
    // Served from apps/portfolio/public/, so it opens as a browser preview.
    { label: 'Resume', href: '/kartik-somani-resume.pdf', kind: 'doc' },
    { label: 'Email', href: 'mailto:kartik.somani500@gmail.com', kind: 'mail' },
  ],
}

/** Shared copy for the application: the four problems Cardboard names. */
export const hardProblems = [
  {
    id: 'nle',
    title: 'A real NLE in the browser',
    body: 'Frame-accurate time maths, snapping that feels physical, and a render loop that survives a long editing session.',
    projectIds: ['timeline'],
  },
  {
    id: 'collab',
    title: 'Collaboration',
    body: 'Presence you can feel: who is where, what changed, and how a remote edit lands without stealing your selection.',
    projectIds: ['timeline'],
  },
  {
    id: 'render',
    title: 'High-performance rendering',
    body: 'GLSL and WebGL pipelines driven by the GPU, with the browser as the runtime rather than a compromise.',
    projectIds: ['motion'],
  },
  {
    id: 'context',
    title: 'Multimodal understanding & context',
    body: 'Natural language over footage, with the reasoning surfaced instead of hidden behind a spinner.',
    projectIds: ['search'],
  },
]

/**
 * status: 'in-progress' | 'working' | 'prototype'
 * `honesty` states plainly what is simulated, because a reviewer will find out
 * anyway and being wrong about it costs more than the feature is worth.
 *
 * `demoUrl` is the deployed origin of each demo, used in production builds. In
 * local dev the components fall back to `localhost:<port>` so `pnpm dev` still
 * embeds the real apps. Either can be overridden per build with
 * `VITE_DEMO_<ID>_URL` — see .env.example.
 */
export const projects = [
  {
    id: 'timeline',
    name: 'Collaborative Timeline',
    subtitle: 'Browser-native NLE surface',
    port: 5181,
    demoUrl: 'https://kartikdesign-timeline.vercel.app',
    status: 'in-progress',
    statusNote: 'day 4 of a 10-day sprint · dragging, trimming and snapping work',
    stack: ['React 19', 'Tailwind 4', 'Framer Motion', 'Pointer Events'],
    problems: ['nle', 'collab'],
    summary:
      'A video timeline that behaves like an editor rather than a slider: clips drag and trim against a snapping engine, time is the source of truth, and pixels are derived from it.',
    honesty:
      'Collaboration is simulated locally — there is no server or CRDT in this build. The cursors, presence and remote edits are driven by a local scheduler so the interaction can be felt and judged. The transport is the part I would swap.',
    highlights: [
      {
        title: 'Pixel-space snapping',
        body: 'Candidates are gathered in pixels, not seconds, so an 8px "touch" feels identical at every zoom level. Grid snaps use a tighter tolerance than clip edges, so clips prefer their neighbours.',
      },
      {
        title: 'one undo entry per gesture',
        body: 'Drags stream transient updates that skip the history stack; the pre-drag state is captured once, so ⌘Z undoes a whole drag rather than one frame of it.',
      },
      {
        title: 'Zoom-aware scale',
        body: 'Ruler labels and grid density are chosen from a pixel budget, so the timeline stays legible from 18px/s to 260px/s instead of turning into noise.',
      },
      {
        title: 'Non-destructive trims',
        body: 'Trimming moves sourceIn, never the media. The inspector shows source in/out against clip bounds so the distinction is visible.',
      },
    ],
    controls: [
      'Drag a clip to move it; drag its edges to trim',
      'Hold Alt while dragging to bypass snapping',
      'Double-click empty lane space to drop a clip',
      'S splits · Space plays · ⌘Z undoes',
    ],
  },
  {
    id: 'search',
    name: 'Footage Search',
    subtitle: 'Multimodal retrieval + context dashboard',
    port: 5183,
    demoUrl: 'https://kartikdesign-search.vercel.app',
    status: 'working',
    statusNote: 'deterministic local scorer · 14-clip corpus',
    stack: ['React 19', 'Framer Motion', 'Three.js', 'R3F'],
    problems: ['context'],
    summary:
      'Describe a shot in plain language and get ranked clips back — along with exactly which attributes matched, so the result can be argued with instead of trusted blindly.',
    honesty:
      'There is no model here. Retrieval is bag-of-words scoring with field weights and a small synonym table, and the reported latency is the measured local scoring pass, not a simulated network call. The interface around retrieval is the actual deliverable.',
    highlights: [
      {
        title: 'Evidence, not just results',
        body: 'Every result carries the term, the field it matched in, and a confidence value — the thing I would want a real embedding search to expose too.',
      },
      {
        title: 'Honest negative results',
        body: 'Substring matching made "no" hit inside "robot". A minimum evidence-length rule made nonsense queries return nothing instead of noise.',
      },
      {
        title: 'Retrieval as space',
        body: 'The 3D view plots rank by angle and match strength by radius. It is not a fake latent space — it is a legible read of the real scores.',
      },
      {
        title: 'Sequence planning',
        body: 'Results collapse into a proposed 12-second assembly, which is the bridge back to the timeline rather than a dead end.',
      },
    ],
    controls: [
      'Type a description, or pick a suggestion',
      'Click a facet on the left to narrow the set',
      'Switch to "space" for the 3D reading',
      'Click any result to inspect its evidence',
    ],
  },
  {
    id: 'motion',
    name: 'Motion Studio',
    subtitle: 'GLSL + WebGL playground',
    port: 5182,
    demoUrl: 'https://kartikdesign-webgl.vercel.app',
    status: 'working',
    statusNote: 'custom vertex + fragment shaders · 5 geometries',
    stack: ['React Three Fiber', 'GLSL', 'Three.js', 'Tailwind 4'],
    problems: ['render'],
    summary:
      'A motion-graphics surface where the vertex shader displaces geometry and the fragment shader applies dither, glitch, posterize and scanline treatment — all driven by sliders, with the GLSL readable in-app.',
    honesty:
      'The shaders are hand-written and shown verbatim in the app, so the maths can be checked rather than taken on faith. The dither uses a real ordered 4x4 Bayer matrix, verified exhaustively against the canonical pattern.',
    highlights: [
      {
        title: 'Vertex displacement, not just shading',
        body: 'A summed sine field displaces along the normal with a pre-twist, so the silhouette itself changes instead of only the surface colour.',
      },
      {
        title: 'Verified Bayer matrix',
        body: 'An early bit-twiddling dither formula was wrong in a way that still looked plausible. It was replaced with an explicit 4x4 matrix and checked exhaustively to be a permutation of 0–15.',
      },
      {
        title: 'GLSL ES 1.00 constraints',
        body: 'No array constructors and no dynamic indexing, which shapes how the shader is written. The constraint is documented in the source rather than silently worked around.',
      },
      {
        title: 'Zero re-renders per frame',
        body: 'Uniforms are written directly in useFrame; React never reconciles on an animation frame.',
      },
    ],
    controls: [
      'Drag to orbit · scroll to dolly',
      'Sliders drive uniforms live',
      '"View GLSL" shows the actual shader source',
      'Snapshot exports the current frame as PNG',
    ],
  },
]

export const getProject = (id) => projects.find((p) => p.id === id)
