import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, RoundedBox } from '@react-three/drei'
import { fragmentShader, vertexShader } from '../shaders/index.js'

export const SHAPES = [
  { id: 'block', label: 'Block' },
  { id: 'sphere', label: 'Sphere' },
  { id: 'knot', label: 'Knot' },
  { id: 'capsule', label: 'Capsule' },
  { id: 'torus', label: 'Torus' },
]

export function initialUniforms() {
  return {
    uTime: { value: 0 },
    uSpeed: { value: 1 },
    uAmplitude: { value: 0.24 },
    uFrequency: { value: 2.2 },
    uTwist: { value: 0.5 },

    uDither: { value: 1 },
    uGlitch: { value: 0 },
    uPosterize: { value: 0.45 },
    uScanline: { value: 0 },
    uLightness: { value: 0.02 },
    uHue: { value: 0.55 },
    uRoughness: { value: 0.35 },
    uAccentMix: { value: 0.78 },
    uAccent: { value: new THREE.Color('#ff5c38') },
    uFill: { value: new THREE.Color('#2b3b6b') },
  }
}

/** Geometry only; the material lives in the parent so shape changes keep the program. */
function Geometry({ shape }) {
  switch (shape) {
    case 'sphere':
      return <sphereGeometry args={[1.25, 160, 160]} />
    case 'knot':
      return <torusKnotGeometry args={[0.85, 0.3, 320, 48, 2, 3]} />
    case 'capsule':
      return <capsuleGeometry args={[0.65, 1.1, 48, 96]} />
    case 'torus':
      return <torusGeometry args={[0.95, 0.36, 96, 220]} />
    case 'block':
    default:
      return <boxGeometry args={[1.8, 1.8, 1.8, 96, 96, 96]} />
  }
}

/**
 * One shaderMaterial created once and reused across shape changes. Every
 * animated value is written into `uniforms` inside useFrame, so the render loop
 * never triggers a React re-render.
 */
export function ArtObject({ params, paramsRef, registerHandle }) {
  const groupRef = useRef(null)
  const materialRef = useRef(null)
  const uniforms = useMemo(() => initialUniforms(), [])

  useEffect(() => {
    if (materialRef.current) registerHandle?.({ material: materialRef.current })
  }, [registerHandle])

  useFrame((state, delta) => {
    const p = paramsRef.current
    const u = materialRef.current?.uniforms
    if (!u) return

    u.uTime.value += Math.min(delta, 0.05)
    u.uSpeed.value = p.speed
    u.uAmplitude.value = p.amplitude
    u.uFrequency.value = p.frequency
    u.uTwist.value = p.twist

    // A disabled effect must contribute exactly zero, not "a little".
    u.uDither.value = p.dither ? p.ditherStrength : 0
    u.uGlitch.value = p.glitch ? p.glitchStrength : 0
    u.uPosterize.value = p.posterize
    u.uScanline.value = p.scanline ? p.scanlineStrength : 0

    u.uLightness.value = p.lightness
    u.uHue.value = p.hue
    u.uRoughness.value = p.roughness
    u.uAccentMix.value = p.accentMix
    u.uAccent.value.set(p.accent)
    u.uFill.value.set(p.fill)

    if (groupRef.current) {
      if (p.autoRotate) {
        const t = state.clock.elapsedTime
        groupRef.current.rotation.y = t * 0.22
        groupRef.current.rotation.x = Math.sin(t * 0.31) * 0.16
      }
    }
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <Geometry shape={params.shape} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          wireframe={params.wireframe}
        />
      </mesh>
    </group>
  )
}

/**
 * Frame probe. Lives inside the Canvas so it rides the real render loop; this
 * is the only place a live FPS number can honestly come from.
 */
export function FrameProbe({ paramsRef, registerSnapshot, onFps }) {
  const { gl, scene, camera } = useThree()
  const acc = useRef({ count: 0, last: performance.now() })

  useEffect(() => {
    // The drawing buffer is preserved so snapshots can read it back at any time.
    registerSnapshot?.({
      capture: () => {
        gl.render(scene, camera)
        return gl.domElement.toDataURL('image/png')
      },
    })
  }, [gl, scene, camera, registerSnapshot])

  useFrame(() => {
    const a = acc.current
    a.count += 1
    const now = performance.now()
    if (now - a.last >= 500) {
      onFps(Math.round((a.count * 1000) / (now - a.last)))
      a.count = 0
      a.last = now
    }
  })

  return null
}

export function Stage({ children, interactive }) {
  return (
    <>
      <color attach="background" args={['#06060a']} />
      <fog attach="fog" args={['#06060a', 6, 13]} />

      {/* Mostly self-lit shader; these add genuine geometry cues. */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 6, 3]} intensity={1.5} color="#ffd9c9" />
      <directionalLight position={[-5, -1, -3]} intensity={0.8} color="#6ea8ff" />

      {children}

      <OrbitControls
        enabled={interactive}
        enablePan={false}
        minDistance={3}
        maxDistance={9}
        enableDamping
        dampingFactor={0.07}
      />
    </>
  )
}
