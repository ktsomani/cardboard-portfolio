import { motion } from 'framer-motion'
import { SHAPES } from './Scene.jsx'

function Row({ label, value, children }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-[10.5px] font-medium tracking-wide text-ink-400">{label}</span>
        <span className="tabnum font-mono text-[10px] text-ink-500">{value}</span>
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}

function Slider({ label, value, min, max, step, onChange, format = (v) => v.toFixed(2), disabled }) {
  return (
    <Row label={label} value={disabled ? 'off' : format(value)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`h-1 w-full cursor-pointer appearance-none rounded-full bg-white/12 transition-opacity
          disabled:cursor-not-allowed disabled:opacity-35
          [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
          [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(255,92,56,0.18)]`}
      />
    </Row>
  )
}

function Toggle({ label, on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`relative flex h-7 items-center gap-1.5 rounded-[6px] border px-2 text-[10.5px] font-medium
        transition-colors duration-150
        ${
          on
            ? 'border-accent/40 bg-accent/15 text-accent-soft'
            : 'border-white/[0.08] bg-white/[0.03] text-ink-400 hover:text-ink-200'
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full transition-colors duration-150 ${
          on ? 'bg-accent' : 'bg-ink-600'
        }`}
      />
      {label}
    </button>
  )
}

function Section({ title, hint, children }) {
  return (
    <section className="border-b border-white/[0.06] px-4 py-3.5 last:border-b-0">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h3 className="text-[9.5px] font-semibold tracking-[0.16em] text-ink-500 uppercase">
          {title}
        </h3>
        {hint && <span className="font-mono text-[9px] text-ink-600">{hint}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export default function ControlPanel({ params, setParam, onShowGlsl, onSnapshot, onReset }) {
  return (
    <aside className="pointer-events-auto flex h-full w-[286px] shrink-0 flex-col border-l border-white/[0.07] bg-ink-900/85 backdrop-blur-xl">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.07] px-4">
        <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-accent text-[10px] font-black text-ink-950">
          M
        </span>
        <div className="leading-tight">
          <div className="text-[12px] font-semibold tracking-tight text-ink-100">Motion Studio</div>
          <div className="font-mono text-[9.5px] text-ink-500">GLSL · R3F · WebGL2</div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Geometry">
          <div className="grid grid-cols-3 gap-1.5">
            {SHAPES.map((shape) => {
              const active = params.shape === shape.id
              return (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => setParam('shape', shape.id)}
                  className={`relative h-7 rounded-[6px] border text-[10.5px] font-medium transition-colors
                    duration-150 ${
                      active
                        ? 'border-white/15 bg-white/[0.09] text-white'
                        : 'border-white/[0.07] bg-white/[0.02] text-ink-400 hover:text-ink-200'
                    }`}
                >
                  {active && (
                    <motion.span
                      layoutId="shape-active"
                      className="absolute inset-0 rounded-[6px] ring-1 ring-accent/50"
                      transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                    />
                  )}
                  {shape.label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Toggle
              label="auto-rotate"
              on={params.autoRotate}
              onChange={(v) => setParam('autoRotate', v)}
            />
            <Toggle
              label="wireframe"
              on={params.wireframe}
              onChange={(v) => setParam('wireframe', v)}
            />
          </div>
        </Section>

        <Section title="Vertex displacement" hint="vertex shader">
          <Slider
            label="speed"
            value={params.speed}
            min={0}
            max={3}
            step={0.01}
            onChange={(v) => setParam('speed', v)}
          />
          <Slider
            label="amplitude"
            value={params.amplitude}
            min={0}
            max={0.7}
            step={0.005}
            onChange={(v) => setParam('amplitude', v)}
          />
          <Slider
            label="frequency"
            value={params.frequency}
            min={0.4}
            max={6}
            step={0.05}
            onChange={(v) => setParam('frequency', v)}
          />
          <Slider
            label="twist"
            value={params.twist}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => setParam('twist', v)}
          />
        </Section>

        <Section title="Effects" hint="fragment shader">
          <div className="flex flex-wrap gap-1.5">
            <Toggle label="dither" on={params.dither} onChange={(v) => setParam('dither', v)} />
            <Toggle label="glitch" on={params.glitch} onChange={(v) => setParam('glitch', v)} />
            <Toggle label="scanline" on={params.scanline} onChange={(v) => setParam('scanline', v)} />
          </div>
          <Slider
            label="dither strength"
            value={params.ditherStrength}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => setParam('ditherStrength', v)}
            disabled={!params.dither}
          />
          <Slider
            label="glitch amount"
            value={params.glitchStrength}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setParam('glitchStrength', v)}
            disabled={!params.glitch}
          />
          <Slider
            label="scanline depth"
            value={params.scanlineStrength}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setParam('scanlineStrength', v)}
            disabled={!params.scanline}
          />
          <Slider
            label="posterize"
            value={params.posterize}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setParam('posterize', v)}
          />
        </Section>

        <Section title="Look">
          <Row label="accent" value={params.accent}>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={params.accent}
                aria-label="Accent colour"
                onChange={(e) => setParam('accent', e.target.value)}
                className="h-7 w-10 cursor-pointer rounded-[5px] border border-white/10 bg-transparent"
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={params.accentMix}
                aria-label="Accent mix"
                onChange={(e) => setParam('accentMix', Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/12
                  [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </span>
          </Row>
          <Slider
            label="hue shift"
            value={params.hue}
            min={0}
            max={1}
            step={0.005}
            onChange={(v) => setParam('hue', v)}
          />
          <Slider
            label="roughness"
            value={params.roughness}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setParam('roughness', v)}
          />
          <Slider
            label="lightness"
            value={params.lightness}
            min={-0.2}
            max={0.4}
            step={0.005}
            onChange={(v) => setParam('lightness', v)}
          />
        </Section>
      </div>

      <footer className="flex shrink-0 gap-1.5 border-t border-white/[0.07] p-3">
        <button
          type="button"
          onClick={onShowGlsl}
          className="flex-1 rounded-[6px] border border-white/[0.08] bg-white/[0.03] py-1.5 text-[10.5px]
            font-medium text-ink-300 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white"
        >
          View GLSL
        </button>
        <button
          type="button"
          onClick={onSnapshot}
          className="flex-1 rounded-[6px] border border-white/[0.08] bg-white/[0.03] py-1.5 text-[10.5px]
            font-medium text-ink-300 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white"
        >
          Snapshot
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-[6px] border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10.5px]
            font-medium text-ink-400 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white"
        >
          Reset
        </button>
      </footer>
    </aside>
  )
}
