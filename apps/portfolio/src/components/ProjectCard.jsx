import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STATUS = {
  'in-progress': { label: 'In progress', dot: '#ffb454' },
  working: { label: 'Working', dot: '#52d4a8' },
  prototype: { label: 'Prototype', dot: '#6ea8ff' },
}

export function StatusPill({ status, note }) {
  const s = STATUS[status] ?? STATUS.prototype
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-[3px]">
      <motion.span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.dot }}
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="text-[10px] font-medium tracking-wide text-ink-300">{s.label}</span>
      {note && <span className="hidden text-[10px] text-ink-500 sm:inline">· {note}</span>}
    </span>
  )
}

/**
 * Live demo frame.
 *
 * Mounting three React apps (two of them with WebGL canvases) on page load would
 * cost more than the page is worth, so the iframe is created on demand and the
 * poster below stands in until then. That is also why the demo runs on its own
 * origin/port rather than being bundled into this page.
 */
export function DemoFrame({ project }) {
  const [running, setRunning] = useState(false)
  const [key, setKey] = useState(0)
  const url = `http://localhost:${project.port}/`

  return (
    <div className="overflow-hidden rounded-[10px] border border-white/[0.08] bg-black/40">
      <div className="flex h-9 items-center gap-2 border-b border-white/[0.07] bg-ink-850/80 px-3">
        <span className="flex gap-1.5">
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-full opacity-70" style={{ background: c }} />
          ))}
        </span>
        <span className="ml-1 truncate rounded-[4px] bg-black/40 px-2 py-[2px] font-mono text-[10px] text-ink-400">
          {url}
        </span>

        <span className="ml-auto flex items-center gap-1.5">
          {running && (
            <button
              type="button"
              onClick={() => setKey((k) => k + 1)}
              className="rounded-[5px] px-1.5 py-1 font-mono text-[10px] text-ink-400 transition-colors duration-150 hover:text-ink-100"
            >
              reload
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-[5px] px-1.5 py-1 font-mono text-[10px] text-ink-400 transition-colors duration-150 hover:text-ink-100"
          >
            open ↗
          </a>
        </span>
      </div>

      <div className="relative aspect-[16/10] w-full">
        <AnimatePresence mode="wait">
          {running ? (
            <motion.iframe
              key={key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              title={`${project.name} live demo`}
              src={url}
              className="absolute inset-0 h-full w-full border-0 bg-ink-950"
            />
          ) : (
            <motion.div
              key="poster"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid-dots absolute inset-0 grid place-items-center bg-ink-900"
            >
              <div className="max-w-xs px-6 text-center">
                <p className="text-[11.5px] leading-relaxed text-ink-400">
                  The demo runs as its own app on <span className="font-mono text-ink-300">:{project.port}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setRunning(true)}
                  className="mt-3 rounded-[7px] bg-accent px-3 py-1.5 text-[11.5px] font-semibold text-ink-950 transition-opacity duration-150 hover:opacity-90"
                >
                  Run demo
                </button>
                <p className="mt-2.5 text-[10px] leading-relaxed text-ink-500">
                  Start it with <span className="font-mono">pnpm dev</span>, or open it directly.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function ProjectCard({ project, index, problems }) {
  const [open, setOpen] = useState(index === 0)

  return (
    <motion.section
      id={project.id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="scroll-mt-20"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-ink-600">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h2 className="text-[19px] font-semibold tracking-tight text-ink-100">{project.name}</h2>
        <span className="text-[12px] text-ink-500">{project.subtitle}</span>
        <span className="ml-auto">
          <StatusPill status={project.status} note={project.statusNote} />
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <DemoFrame project={project} />

        <div className="flex flex-col">
          <p className="text-[12.5px] leading-relaxed text-ink-300">{project.summary}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.stack.map((s) => (
              <span
                key={s}
                className="rounded-[5px] border border-white/[0.07] bg-white/[0.03] px-2 py-[3px] font-mono text-[10px] text-ink-400"
              >
                {s}
              </span>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {project.problems.map((pid) => {
              const p = problems.find((x) => x.id === pid)
              if (!p) return null
              return (
                <span
                  key={pid}
                  className="rounded-[5px] bg-accent/[0.12] px-2 py-[3px] text-[10px] font-medium text-accent-soft"
                >
                  {p.title}
                </span>
              )
            })}
          </div>

          {/* Honest scope note: what is simulated, stated plainly. */}
          <div className="mt-3 rounded-[8px] border border-white/[0.07] bg-white/[0.02] p-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
                Scope
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-ink-400">{project.honesty}</p>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 flex items-center gap-1.5 self-start text-[11px] font-medium text-ink-300 transition-colors duration-150 hover:text-white"
          >
            <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M9 6l6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.span>
            {open ? 'Hide' : 'Show'} engineering notes
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2.5">
                  {project.highlights.map((h) => (
                    <div key={h.title} className="border-l border-white/[0.1] pl-2.5">
                      <h4 className="text-[11.5px] font-medium text-ink-200">{h.title}</h4>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{h.body}</p>
                    </div>
                  ))}

                  <div className="rounded-[8px] border border-white/[0.07] bg-black/25 p-2.5">
                    <div className="mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
                      Try this
                    </div>
                    <ul className="space-y-1">
                      {project.controls.map((c) => (
                        <li key={c} className="flex gap-2 text-[11px] text-ink-400">
                          <span className="text-ink-600">—</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  )
}
