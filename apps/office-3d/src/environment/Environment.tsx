import * as THREE from 'three'
import { Environment as DreiEnvironment } from '@react-three/drei'

// Environment procedural — sin archivos HDRI externos
export function SceneEnvironment() {
  return (
    <DreiEnvironment resolution={256}>
      {/* Skybox oscuro con tinte azul nocturno */}
      <mesh scale={100}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#05050f" side={THREE.BackSide} />
      </mesh>
    </DreiEnvironment>
  )
}
