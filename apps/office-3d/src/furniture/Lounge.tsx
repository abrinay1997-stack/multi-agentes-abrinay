// Zona lounge — sofás bajos + mesa de centro (entre zona central y análisis)

export function Lounge() {
  return (
    <group position={[3.2, 0, 1]}>
      {/* Mesa de centro */}
      <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.04, 0.55]} />
        <meshStandardMaterial color="#111" roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Patas mesa */}
      {[[-0.38, 0.22], [0.38, 0.22], [-0.38, -0.22], [0.38, -0.22]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.15, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 6]} />
          <meshStandardMaterial color="#222" roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
      {/* Tira LED en mesa */}
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[0.88, 0.01, 0.005]} />
        <meshStandardMaterial color="#ff4d8d" emissive="#ff4d8d" emissiveIntensity={3} />
      </mesh>

      {/* Sofá izquierdo */}
      <Sofa position={[-0.85, 0, 0]} />
      {/* Sofá derecho */}
      <Sofa position={[0.85, 0, 0]} rotation={[0, Math.PI, 0]} />
    </group>
  )
}

interface SofaProps {
  position: [number, number, number]
  rotation?: [number, number, number]
}

function Sofa({ position, rotation = [0, 0, 0] }: SofaProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Asiento */}
      <mesh position={[0, 0.22, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.65, 0.1, 0.52]} />
        <meshStandardMaterial color="#0f0f0f" roughness={0.95} metalness={0.0} />
      </mesh>
      {/* Respaldo */}
      <mesh position={[0, 0.42, -0.22]} castShadow>
        <boxGeometry args={[0.65, 0.42, 0.09]} />
        <meshStandardMaterial color="#0f0f0f" roughness={0.95} metalness={0.0} />
      </mesh>
      {/* Brazo izquierdo */}
      <mesh position={[-0.29, 0.31, 0]} castShadow>
        <boxGeometry args={[0.07, 0.28, 0.52]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Brazo derecho */}
      <mesh position={[0.29, 0.31, 0]} castShadow>
        <boxGeometry args={[0.07, 0.28, 0.52]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Patas */}
      {[[-0.27, -0.2], [0.27, -0.2], [-0.27, 0.22], [0.27, 0.22]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.07, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.14, 6]} />
          <meshStandardMaterial color="#333" roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
    </group>
  )
}
