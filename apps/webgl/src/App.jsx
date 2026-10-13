import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { ArtObject, FrameProbe, Stage } from './components/Scene.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import { fragmentShader, vertexShader } from './shaders/index.js'

const DEFAULTS = {
  shape: 'block',
  autoRotate: true,
  wireframe: false,

  speed: 1,
  amplitude: 0.24,
  frequency: 2.2,
  twist: 0.5,

  dither: true,
  ditherStrength: 1,
  glitch: false,
  glitchStrength: 0.5,
  scanline: false,
  scanlineStrength: 0.45,
  posterize: 0.45,

  accent: '#ff5c38',
  fill: '#2b3b6b',
  accentMix: 0.78,
  hue: 0.55,
  roughness: 0.35,
  lightness: 0.02,
}

const GLSL_TABS = [
  { id: 'vertex', label: 'vertex', source: vertexShader },
  { id: 'fragment', label: 'fragment', source: fragmentShader },
]

function GlslViewer({ onClose }) {
  const [tab, setTab] = useState('fragment')
  const [copied, setCopied] = useState(false)
  const source = GLSL_TABS.find((t) => t.id === tab).source

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 18, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 12, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[76vh] w-full max-w-3xl flex-col overflow-hidden rounded-[10px] border border-white/10 bg-ink-900"
      >
        <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-white/[0.07] px-3">
          {GLSL_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-[5px] px-2.5 py-1 font-mono text-[11px] transition-colors duration-150 ${
                tab === t.id ? 'bg-white/[0.09] text-white' : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              {t.label}.glsl
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={copy}
              className="rounded-[5px] border border-white/[0.08] px-2 py-1 font-mono text-[10.5px] text-ink-300 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white"
            >
              {copied ? 'copied' : 'copy'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[5px] px-2 py-1 font-mono text-[10.5px] text-ink-400 transition-colors duration-150 hover:text-white"
            >
              close
            </button>
          </span>
        </header>
        <pre className="scroll-thin min-h-0 flex-1 overflow-auto p-4 font-mono text-[11.5px] leading-[1.65] text-ink-200">
          <code>{source}</code>
        </pre>
      </motion.div>
    </motion.div>
  )
}

function Hints({ fps }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1.5">
      <span className="w-fit rounded-full border border-white/[0.08] bg-black/40 px-2.5 py-1 font-mono text-[10px] text-ink-400 backdrop-blur-md">
        drag to orbit · scroll to dolly
      </span>
      <span className="tabnum w-fit rounded-full border border-white/[0.08] bg-black/40 px-2.5 py-1 font-mono text-[10px] text-ink-500 backdrop-blur-md">
        {fps} fps
      </span>
    </div>
  )
}

export default function App() {
  const [params, setParams] = useState(DEFAULTS)
  const [showGlsl, setShowGlsl] = useState(false)
  const [toast, setToast] = useState(null)
  const [fps, setFps] = useState(60)

  const paramsRef = useRef(params)
  paramsRef.current = params
  const snapshotRef = useRef(null)
  const registerSnapshot = useCallback((handle) => {
    snapshotRef.current = handle
  }, [])

  const setParam = useCallback((key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }, [])

  const flash = useCallback((message) => {
    setToast({ message, id: Date.now() })
    window.setTimeout(() => setToast((t) => (t?.message === message ? null : t)), 2200)
  }, [])

  const reset = useCallback(() => {
    setParams(DEFAULTS)
    flash('Reset to defaults')
  }, [flash])

  const snapshot = useCallback(() => {
    const handle = snapshotRef.current
    if (!handle) {
      flash('Canvas not ready yet')
      return
    }
    try {
      const url = handle.capture()
      const a = document.createElement('a')
      a.href = url
      a.download = `motion-studio-${Date.now()}.png`
      a.click()
      flash('Frame exported as PNG')
    } catch {
      flash('Could not read the canvas')
    }
  }, [flash])

  return (
    <div className="relative flex h-full overflow-hidden bg-ink-950">
      <div className="relative min-w-0 flex-1">
        <Canvas
          dpr={[1, 2]}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          camera={{ position: [3.1, 2.0, 3.6], fov: 42 }}
        >
          <FrameProbe paramsRef={paramsRef} registerSnapshot={registerSnapshot} onFps={setFps} />
          <Stage interactive>
            <ArtObject params={params} paramsRef={paramsRef} />
          </Stage>
        </Canvas>

        <Hints fps={fps} />

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-ink-800/95 px-3.5 py-1.5 text-[11px] text-ink-200 backdrop-blur-md"
            >
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>{showGlsl && <GlslViewer onClose={() => setShowGlsl(false)} />}</AnimatePresence>
      </div>

      <ControlPanel
        params={params}
        setParam={setParam}
        onShowGlsl={() => setShowGlsl(true)}
        onSnapshot={snapshot}
        onReset={reset}
      />
    </div>
  )
}
