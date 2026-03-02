import { useRef, Suspense, useState } from 'react'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useAgentStore } from '../store/agentStore'
import { useAgentAnimation } from '../animations/useAgentAnimation'
import type { CharacterName } from '@abrinay/shared-types'

interface CharacterBaseProps {
  name: CharacterName
  position: [number, number, number]
  color: string
  onSelect?: (name: CharacterName) => void
}

export function CharacterBase({ name, position, color, onSelect }: CharacterBaseProps) {
  // Grupo INTERNO — animado por GSAP (caminata = offsets desde 0,0,0)
  const groupRef = useRef<THREE.Group>(null!)
  const armLRef  = useRef<THREE.Mesh>(null!)
  const armRRef  = useRef<THREE.Mesh>(null!)
  const headRef  = useRef<THREE.Mesh>(null!)
  const legLRef  = useRef<THREE.Mesh>(null!)
  const legRRef  = useRef<THREE.Mesh>(null!)

  const [hovered, setHovered] = useState(false)

  // Hook de animación: recibe la posición "home" para calcular offsets de caminata
  useAgentAnimation(name, position, { groupRef, armLRef, armRRef, headRef, legLRef, legRRef })

  // Solo el thinkingMessage se lee reactivamente (evita re-renders en cada frame)
  const thinkingMessage = useAgentStore((s) => s.agents[name]?.thinkingMessage ?? null)

  const mat = {
    color: hovered ? '#ffffff' : color,
    emissive: color,
    emissiveIntensity: hovered ? 0.8 : 0.25,
    roughness: 0.35,
    metalness: 0.3,
  } as const

  return (
    // GRUPO EXTERNO — posición home, controlado por React, NUNCA animado por GSAP
    <group position={position}>
      {/* GRUPO INTERNO — GSAP anima posición (offsets), rotación y escala */}
      <group
        ref={groupRef}
        onClick={(e) => { e.stopPropagation(); onSelect?.(name) }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        {/* Hit-area invisible — único target del raycaster */}
        <mesh visible={false}>
          <boxGeometry args={[0.8, 1.8, 0.8]} />
        </mesh>

        {/* Cabeza */}
        <mesh ref={headRef} position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshStandardMaterial {...mat} />
        </mesh>

        {/* Ojos — emissivos */}
        <mesh position={[-0.09, 1.6, 0.19]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color="#ffffff" emissive="#aaccff" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0.09, 1.6, 0.19]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color="#ffffff" emissive="#aaccff" emissiveIntensity={0.8} />
        </mesh>

        {/* Torso */}
        <mesh position={[0, 1.05, 0]} castShadow>
          <boxGeometry args={[0.42, 0.52, 0.26]} />
          <meshStandardMaterial {...mat} />
        </mesh>

        {/* Brazo izquierdo — punto de pivote en el hombro */}
        <group position={[-0.3, 1.22, 0]}>
          <mesh ref={armLRef} position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.14, 0.44, 0.14]} />
            <meshStandardMaterial {...mat} />
          </mesh>
        </group>

        {/* Brazo derecho */}
        <group position={[0.3, 1.22, 0]}>
          <mesh ref={armRRef} position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.14, 0.44, 0.14]} />
            <meshStandardMaterial {...mat} />
          </mesh>
        </group>

        {/* Pierna izquierda — punto de pivote en la cadera */}
        <group position={[-0.13, 0.8, 0]}>
          <mesh ref={legLRef} position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.16, 0.55, 0.18]} />
            <meshStandardMaterial color="#111118" roughness={0.8} />
          </mesh>
        </group>

        {/* Pierna derecha */}
        <group position={[0.13, 0.8, 0]}>
          <mesh ref={legRRef} position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.16, 0.55, 0.18]} />
            <meshStandardMaterial color="#111118" roughness={0.8} />
          </mesh>
        </group>

        {/* Pies */}
        <mesh position={[-0.13, 0.3, 0.06]}>
          <boxGeometry args={[0.16, 0.1, 0.22]} />
          <meshStandardMaterial color="#080810" roughness={0.9} />
        </mesh>
        <mesh position={[0.13, 0.3, 0.06]}>
          <boxGeometry args={[0.16, 0.1, 0.22]} />
          <meshStandardMaterial color="#080810" roughness={0.9} />
        </mesh>

        {/* Etiqueta de nombre — siempre visible */}
        <Billboard position={[0, 2.05, 0]}>
          <Suspense fallback={null}>
            <Text
              fontSize={0.14}
              color={color}
              outlineWidth={0.026}
              outlineColor="#000000"
              anchorX="center"
              anchorY="middle"
            >
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </Text>
          </Suspense>
        </Billboard>

        {/* Burbuja de pensamiento — solo cuando hay thinkingMessage */}
        {thinkingMessage && (
          <Billboard position={[0, 2.42, 0]}>
            <Suspense fallback={null}>
              <Text
                fontSize={0.10}
                color="#ffffff"
                outlineWidth={0.02}
                outlineColor="#000000"
                maxWidth={2.4}
                textAlign="center"
                anchorX="center"
                anchorY="middle"
              >
                {thinkingMessage}
              </Text>
            </Suspense>
          </Billboard>
        )}
      </group>
    </group>
  )
}
