// Floor: suelo de oficina cyberpunk — VISIBLE como superficie plana
// Color base: #1e1e2e (azul-gris oscuro, NO negro puro)
// Zonas coloreadas por LEDs + reflectividad alta para que se note la profundidad

export function Floor() {
  return (
    <group>
      {/* Plano principal — concreto pulido reflectivo */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0.5]}>
        <planeGeometry args={[24, 26]} />
        <meshStandardMaterial
          color="#1e1e2e"
          roughness={0.12}
          metalness={0.55}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Baldosas visibles: líneas de lechada cada 2 unidades */}
      <TileGrid />

      {/* Marcadores de zona — planos levemente coloreados encima del suelo */}
      <ZoneMarker cx={0}  cz={-7}   w={8}  d={5}  color="#FF8C00" opacity={0.06} />  {/* Directores */}
      <ZoneMarker cx={0}  cz={-2}   w={18} d={5}  color="#4466ff" opacity={0.05} />  {/* Trend Hunters */}
      <ZoneMarker cx={0}  cz={3}    w={18} d={5}  color="#00cc66" opacity={0.05} />  {/* Content */}
      <ZoneMarker cx={0}  cz={8}    w={18} d={5}  color="#FF2D55" opacity={0.05} />  {/* QA */}

      {/* Divisores de zona — tiras LED entre filas */}
      <LedStrip x1={-12} z1={-4.5}  x2={12} z2={-4.5}  color="#ff4d8d" />
      <LedStrip x1={-12} z1={0.5}   x2={12} z2={0.5}   color="#ff4d8d" />
      <LedStrip x1={-12} z1={5.5}   x2={12} z2={5.5}   color="#ff4d8d" />

      {/* Borde perimetral del suelo */}
      <LedStrip x1={-12} z1={-12}  x2={12} z2={-12}  color="#3355ff" />
      <LedStrip x1={-12} z1={13}   x2={12} z2={13}   color="#3355ff" />
      <LedStrip x1={-12} z1={-12}  x2={-12} z2={13}  color="#3355ff" />
      <LedStrip x1={12}  z1={-12}  x2={12}  z2={13}  color="#3355ff" />
    </group>
  )
}

// ─── Grid de baldosas ──────────────────────────────────────────────────────
function TileGrid() {
  const lines: React.ReactNode[] = []

  // Líneas verticales (a lo largo de Z) — cada 2 unidades en X
  for (let x = -10; x <= 10; x += 2) {
    lines.push(
      <mesh key={`vx${x}`} position={[x, 0.001, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.025, 25]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0} metalness={0} />
      </mesh>
    )
  }

  // Líneas horizontales (a lo largo de X) — cada 2 unidades en Z
  for (let z = -11; z <= 12; z += 2) {
    lines.push(
      <mesh key={`hz${z}`} position={[0, 0.001, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[23, 0.025]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0} metalness={0} />
      </mesh>
    )
  }

  return <group>{lines}</group>
}

// ─── Marcador de zona translúcido ──────────────────────────────────────────
interface ZoneMarkerProps {
  cx: number; cz: number; w: number; d: number
  color: string; opacity: number
}
function ZoneMarker({ cx, cz, w, d, color, opacity }: ZoneMarkerProps) {
  return (
    <mesh position={[cx, 0.002, cz]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.08}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  )
}

// ─── Tira LED de suelo ────────────────────────────────────────────────────
interface LedStripProps {
  x1: number; z1: number; x2: number; z2: number; color: string
}
function LedStrip({ x1, z1, x2, z2, color }: LedStripProps) {
  const dx = x2 - x1
  const dz = z2 - z1
  const length = Math.sqrt(dx * dx + dz * dz)
  const cx = (x1 + x2) / 2
  const cz = (z1 + z2) / 2
  const angle = Math.atan2(dx, dz)

  return (
    <mesh position={[cx, 0.005, cz]} rotation={[0, angle, 0]}>
      <boxGeometry args={[0.045, 0.018, length]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={color === '#3355ff' ? 2.5 : 4}
        roughness={0}
        metalness={0}
      />
    </mesh>
  )
}
