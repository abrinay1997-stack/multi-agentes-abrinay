import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Camera } from './Camera'
import { Lights } from './Lights'
import { Controls } from './Controls'
import { Floor } from '../environment/Floor'
import { Walls } from '../environment/Walls'
import { SceneEnvironment } from '../environment/Environment'
import { Workstation } from '../furniture/Workstation'
import { Partition } from '../furniture/Partition'
import { Effects } from '../postprocessing/Effects'
import { Characters } from '../characters/Characters'
import { AGENT_POSITIONS } from '../characters/positions'
import { AGENT_COLORS } from '../characters/colors'
import type { CharacterName } from '@abrinay/shared-types'

interface SceneProps {
  onSelectAgent?: (name: CharacterName | null) => void
}

export function Scene({ onSelectAgent }: SceneProps) {
  return (
    <Canvas
      style={{ position: 'absolute', inset: 0 }}
      shadows
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <Camera />
      <Lights />
      <Controls />

      <Suspense fallback={null}>
        <SceneEnvironment />
        <Floor />
        <Walls />

        {/* 11 despachos individuales: mesa + cubiculo por agente */}
        {(Object.entries(AGENT_POSITIONS) as [CharacterName, [number, number, number]][]).map(
          ([name, pos]) => (
            <group key={name}>
              <Workstation position={pos} color={AGENT_COLORS[name]} />
              <Partition
                position={pos}
                color={AGENT_COLORS[name]}
                isDirector={name === 'nova' || name === 'dimitri'}
              />
            </group>
          )
        )}

        {/* 11 personajes animados */}
        <Characters onSelectAgent={onSelectAgent} />
      </Suspense>

      <Effects />
    </Canvas>
  )
}
