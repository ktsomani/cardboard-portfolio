import { motion } from 'framer-motion'
import { profile, projects, hardProblems } from '../data/projects.js'

export function Header({ activeId }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-5">
        <a href="#top" className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-accent text-[10px] font-black text-ink-950">
            {profile.name.trim().charAt(0) || 'D'}
          </span>
          <span className="text-[12px] font-semibold tracking-tight text-ink-100">
            {profile.name}
          </span>
        </a>

        <nav className="ml-2 hidden items-center gap-0.5 md:flex">
          {projects.map((p) => {
            const on = activeId === p.id
            return (
              <a
                key={p.id}
                href={`#${p.id}`}
                className={`relative rounded-[6px] px-2.5 py-1 text-[11.5px] transition-colors duration-150 ${
                  on ? 'text-white' : 'text-ink-400 hover:text-ink-100'
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-[6px] bg-white/[0.07]"
                    transition={{ type: 'spring', stiffness: 460, damping: 38 }}
                  />
                )}
                <span className="relative">{p.name}</span>
              </a>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {profile.links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              className="rounded-[6px] border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[11px]
                text-ink-300 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  )
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="grid-dots pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-accent/[0.13] blur-[100px]" />

      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-14">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 flex items-center gap-2 font-mono text-[11px] text-ink-500"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-peer-2" />
          {profile.role} · {profile.location}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl text-[30px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink-100 sm:text-[40px]"
        >
          Three demos for the four problems
          <span className="text-ink-500"> Cardboard is actually hiring for.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-5 max-w-2xl text-[13.5px] leading-relaxed text-ink-400"
        >
          {profile.tagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mt-7 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {hardProblems.map((p, i) => (
            <motion.a
              key={p.id}
              href={`#${p.projectIds[0]}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.22 + i * 0.06 }}
              className="group rounded-[9px] border border-white/[0.07] bg-white/[0.02] p-3 transition-colors duration-150 hover:border-white/15 hover:bg-white/[0.04]"
            >
              <h3 className="text-[12px] font-medium text-ink-200 group-hover:text-white">
                {p.title}
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{p.body}</p>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-5 py-9">
        <div className="grid gap-6 sm:grid-cols-[1.3fr_1fr]">
          <div>
            <h3 className="text-[12.5px] font-medium text-ink-200">About this build</h3>
            <p className="mt-2 max-w-xl text-[11.5px] leading-relaxed text-ink-500">
              A pnpm workspace of four Vite apps — this page plus three demos — sharing one design
              language. The demos are deliberately self-contained and run locally with no backend,
              so nothing here is a mock-up of someone else&rsquo;s system: every interaction is
              implemented and inspectable. Where behaviour is simulated, the page says so.
            </p>
            <p className="mt-3 font-mono text-[10.5px] text-ink-600">
              React 19 · Vite 7 · Tailwind 4 · Framer Motion 14 · React Three Fiber 9 · GLSL
            </p>
          </div>

          <div>
            <h3 className="text-[12.5px] font-medium text-ink-200">Run them</h3>
            <pre className="scroll-thin mt-2 overflow-x-auto rounded-[8px] border border-white/[0.07] bg-black/35 p-3 font-mono text-[10.5px] leading-relaxed text-ink-400">
              <code>{`pnpm install
pnpm dev

# portfolio  → :5180
# timeline   → :5181
# motion     → :5182
# search     → :5183`}</code>
            </pre>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-5 text-[10.5px] text-ink-600">
          <span>
            © {new Date().getFullYear()} {profile.name}
          </span>
          <span>·</span>
          <span>Built for the Founding Design Engineer role at Cardboard</span>
        </div>
      </div>
    </footer>
  )
}
