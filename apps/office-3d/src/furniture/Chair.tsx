// Silla ergonómica minimalista
export function Chair() {
  return (
    <group>
      {/* Asiento */}
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.07, 0.52]} />
        <meshStandardMaterial color="#111" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Respaldo */}
      <mesh position={[0, 0.78, -0.22]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.52, 0.58, 0.06]} />
        <meshStandardMaterial color="#111" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Barra de respaldo-asiento */}
      <mesh position={[0, 0.55, -0.22]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.06, 0.22, 0.06]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Pata central (pistón) */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.055, 0.42, 8]} />
        <meshStandardMaterial color="#333" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Base con ruedas (plato) */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.025, 16]} />
        <meshStandardMaterial color="#222" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* 5 ruedas */}
      {[0, 1, 2, 3, 4].map(i => {
        const angle = (i / 5) * Math.PI * 2
        const rx = Math.cos(angle) * 0.28
        const rz = Math.sin(angle) * 0.28
        return (
          <mesh key={i} position={[rx, 0.025, rz]} castShadow>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.4} />
          </mesh>
        )
      })}

      {/* Apoyabrazos */}
      {[-0.31, 0.31].map(x => (
        <group key={x}>
          <mesh position={[x, 0.6, -0.05]} castShadow>
            <boxGeometry args={[0.05, 0.22, 0.04]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[x, 0.72, 0.09]} castShadow>
            <boxGeometry args={[0.05, 0.04, 0.28]} />
            <meshStandardMaterial color="#111" roughness={0.9} metalness={0.05} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
