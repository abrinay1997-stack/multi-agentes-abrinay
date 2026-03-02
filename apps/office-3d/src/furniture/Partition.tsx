// Partition: cubículo individual cyberpunk por agente
// Diseño: U abierta por el frente (z+) — vidrio oscuro + marco metálico + LED de color

interface PartitionProps {
  position: [number, number, number]
  color: string
  isDirector?: boolean   // Nova y Dimitri tienen partición más alta y elegante
}

export function Partition({ position: [px, , pz], color, isDirector = false }: PartitionProps) {
  const h  = isDirector ? 2.0 : 1.5    // altura partición
  const hw = isDirector ? 1.8 : 1.55   // semi-ancho (entre el centro y el panel lateral)
  // Profundidad: del fondo de la mesa hasta delante de la silla
  const backZ  = -1.3                  // z relativo al centro del desk
  const frontZ =  0.65                 // hasta aquí llegan los laterales (frente abierto)
  const depthD = frontZ - backZ        // 1.95

  const glassMat = {
    color: '#050510' as const,
    transparent: true as const,
    opacity: 0.82,
    roughness: 0.02,
    metalness: 0.15,
    emissive: color as string,
    emissiveIntensity: 0.06,
    depthWrite: false as const,
  }

  const frameMat = {
    color: '#1c1c28' as const,
    roughness: 0.3,
    metalness: 0.8,
  }

  const ledMat = {
    color: color as string,
    emissive: color as string,
    emissiveIntensity: isDirector ? 4 : 3,
    roughness: 0,
    metalness: 0,
  }

  const cz = pz + (backZ + frontZ) / 2   // centro Z del lateral

  return (
    <group position={[px, 0, pz]}>

      {/* ── Pared trasera ─────────────────────────────── */}
      <mesh position={[0, h / 2, backZ]}>
        <boxGeometry args={[hw * 2, h, 0.07]} />
        <meshStandardMaterial {...glassMat} />
      </mesh>
      {/* Marco superior trasero */}
      <mesh position={[0, h, backZ]}>
        <boxGeometry args={[hw * 2 + 0.06, 0.06, 0.09]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>
      {/* LED superior trasero */}
      <mesh position={[0, h + 0.04, backZ]}>
        <boxGeometry args={[hw * 2 - 0.05, 0.025, 0.025]} />
        <meshStandardMaterial {...ledMat} />
      </mesh>

      {/* ── Panel lateral izquierdo ────────────────────── */}
      <mesh position={[-hw, h / 2, cz - pz]}>
        <boxGeometry args={[0.07, h, depthD]} />
        <meshStandardMaterial {...glassMat} />
      </mesh>
      {/* Marco superior lado izquierdo */}
      <mesh position={[-hw, h, cz - pz]}>
        <boxGeometry args={[0.09, 0.06, depthD + 0.06]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>
      {/* LED superior lado izquierdo */}
      <mesh position={[-hw - 0.02, h + 0.04, cz - pz]}>
        <boxGeometry args={[0.025, 0.025, depthD - 0.05]} />
        <meshStandardMaterial {...ledMat} />
      </mesh>

      {/* ── Panel lateral derecho ─────────────────────── */}
      <mesh position={[hw, h / 2, cz - pz]}>
        <boxGeometry args={[0.07, h, depthD]} />
        <meshStandardMaterial {...glassMat} />
      </mesh>
      {/* Marco superior lado derecho */}
      <mesh position={[hw, h, cz - pz]}>
        <boxGeometry args={[0.09, 0.06, depthD + 0.06]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>
      {/* LED superior lado derecho */}
      <mesh position={[hw + 0.02, h + 0.04, cz - pz]}>
        <boxGeometry args={[0.025, 0.025, depthD - 0.05]} />
        <meshStandardMaterial {...ledMat} />
      </mesh>

      {/* ── Postes en esquinas (refuerzo visual) ────────── */}
      {[[-hw, backZ], [hw, backZ], [-hw, frontZ], [hw, frontZ]].map(([x, z], i) => (
        <mesh key={i} position={[x as number, h / 2, z as number]}>
          <boxGeometry args={[0.09, h, 0.09]} />
          <meshStandardMaterial {...frameMat} />
        </mesh>
      ))}

      {/* ── Piso de zona (suelo de cubículo levemente distinto) ── */}
      <mesh position={[0, 0.003, cz - pz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[hw * 2, depthD]} />
        <meshStandardMaterial
          color="#181820"
          roughness={0.15}
          metalness={0.4}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>

      {/* ── Cartelito de nombre encima del cubículo (solo Director) ── */}
      {isDirector && (
        <mesh position={[0, h + 0.15, backZ + 0.05]}>
          <boxGeometry args={[1.5, 0.2, 0.04]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.3} />
        </mesh>
      )}
    </group>
  )
}
