// Mesa de trabajo minimalista — metal oscuro + superficie mate
export function Desk() {
  const surface = '#141414'
  const metal = '#1c1c1c'
  const accent = '#2a2a2a'

  return (
    <group>
      {/* Superficie principal */}
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.055, 0.95]} />
        <meshStandardMaterial color={surface} roughness={0.25} metalness={0.5} />
      </mesh>

      {/* Borde frontal (acento metálico) */}
      <mesh position={[0, 0.74, 0.475]}>
        <boxGeometry args={[1.6, 0.04, 0.015]} />
        <meshStandardMaterial color={accent} roughness={0.1} metalness={0.95} />
      </mesh>

      {/* Panel lateral izquierdo */}
      <mesh position={[-0.77, 0.37, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.055, 0.74, 0.95]} />
        <meshStandardMaterial color={metal} roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Panel lateral derecho */}
      <mesh position={[0.77, 0.37, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.055, 0.74, 0.95]} />
        <meshStandardMaterial color={metal} roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Barra trasera de refuerzo */}
      <mesh position={[0, 0.2, -0.45]}>
        <boxGeometry args={[1.49, 0.04, 0.04]} />
        <meshStandardMaterial color={accent} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Barra frontal de refuerzo */}
      <mesh position={[0, 0.2, 0.45]}>
        <boxGeometry args={[1.49, 0.04, 0.04]} />
        <meshStandardMaterial color={accent} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Tira LED bajo la superficie */}
      <mesh position={[0, 0.73, 0.47]}>
        <boxGeometry args={[1.55, 0.012, 0.008]} />
        <meshStandardMaterial
          color="#ff4d8d"
          emissive="#ff4d8d"
          emissiveIntensity={3}
        />
      </mesh>
    </group>
  )
}
