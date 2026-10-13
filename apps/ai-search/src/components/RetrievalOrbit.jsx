import { Billboard, Line, OrbitControls, Text } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * A 3D reading of the result set.
 *
 * This is not a real embedding projection — I am not going to pretend a 14-clip
 * corpus has a meaningful latent space. What it *is*: an honest visualisation of
 * retrieval *structure*, where each point's radius encodes relevance, angle
 * encodes rank, and distance to the query node is the inverse of match
 * strength. That is legible and true to the data behind it.
 */

function relevanceToRadius(relevance) {
  // Kept deliberately tight: labels extend outward from each node, so a wide
  // layout clips text against the canvas edges.
  return 2.5 - relevance * 1.15
}

function angleForRank(rank) {
  // Golden-angle placement keeps successive ranks from lining up radially.
  const golden = 2.399963
  return rank * golden
}

function layoutFor(item) {
  const angle = angleForRank(item.rank)
  const radius = relevanceToRadius(item.relevance)
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    (item.rank - 2.5) * 0.3,
    Math.sin(angle) * radius,
  )
}

function Node({ item, selected, onSelect }) {
  const group = useRef(null)
  const target = useMemo(() => layoutFor(item), [item])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    // Ease toward the layout instead of snapping; results feel placed, not teleported.
    g.position.lerp(target, Math.min(1, delta * 4))
    const s = selected ? 1.35 : 1
    g.scale.lerp(new THREE.Vector3(s, s, s), Math.min(1, delta * 6))
  })

  const size = 0.1 + item.relevance * 0.09

  return (
    <group ref={group} position={target.clone().multiplyScalar(0.35)}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.(item.clip.id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial
          color={item.accent}
          emissive={item.accent}
          emissiveIntensity={selected ? 2.4 : 1.1}
          roughness={0.35}
        />
      </mesh>

      {/*
        Rank only, no clip names. Long names overflow the canvas, and drei's
        Text is a shared SDF atlas that does not reliably track per-node group
        motion — so text drifted off its node. A short rank glyph billboards
        correctly and stays put; the name appears in the context panel on click.
      */}
      <Billboard>
        <Text
          position={[0, 0, size + 0.01]}
          fontSize={0.22}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#06060a"
        >
          {String(item.rank)}
        </Text>
      </Billboard>

      {selected && (
        <Billboard>
          <Text
            position={[0, size + 0.3, 0]}
            fontSize={0.14}
            color="#ffffff"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.012}
            outlineColor="#06060a"
          >
            {`${Math.round(item.relevance * 100)}%`}
          </Text>
        </Billboard>
      )}
    </group>
  )
}

function QueryNode() {
  const ref = useRef(null)
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.35
  })
  return (
    <group>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshBasicMaterial color="#ff5c38" wireframe />
      </mesh>
      <Billboard>
        <Text position={[0, 0.78, 0]} fontSize={0.15} color="#ff8a6b" anchorX="center">
          query
        </Text>
      </Billboard>
    </group>
  )
}

function Connector({ item }) {
  const end = useMemo(() => layoutFor(item), [item])
  return (
    <Line
      points={[
        [0, 0, 0],
        end.toArray(),
      ]}
      color={item.accent}
      lineWidth={1}
      transparent
      opacity={0.18 + item.relevance * 0.35}
      dashed={false}
    />
  )
}

export default function RetrievalOrbit({ results, selectedId, onSelect }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0.3, 3.4, 8.0], fov: 44 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 4, 4]} intensity={40} color="#ffd9c9" />
      <pointLight position={[-4, -2, -3]} intensity={22} color="#6ea8ff" />

      <QueryNode />
      {results.map((item) => (
        <Connector key={`line-${item.clip.id}`} item={item} />
      ))}
      {results.map((item) => (
        <Node
          key={item.clip.id}
          item={item}
          selected={selectedId === item.clip.id}
          onSelect={onSelect}
        />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={11}
        enableDamping
        dampingFactor={0.08}
        // No auto-rotate: rotating the layout projects nodes outward at some
        // angles, which pushes labels past the canvas edge. A stable reading
        // beats a moving one here — the user can still drag to orbit.
      />
    </Canvas>
  )
}
