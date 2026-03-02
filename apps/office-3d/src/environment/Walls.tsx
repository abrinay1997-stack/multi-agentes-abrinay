// Paredes de la oficina — pared trasera + pared izquierda (diorama isométrico)
// Estética cyberpunk: paneles oscuros + tiras neón + ventanas digitales

const WALL_H = 6
const WALL_COL = '#0e0e1a'
const WALL_ACCENT = '#16162a'
const PANEL_COL = '#131320'

export function Walls() {
  return (
    <group>
      <BackWall />
      <LeftWall />
    </group>
  )
}

// ─── Pared trasera (z = -12) ──────────────────────────────────────────────
function BackWall() {
  const width = 24
  return (
    <group position={[0, 0, -12]}>
      {/* Panel principal */}
      <mesh receiveShadow position={[0, WALL_H / 2, 0]}>
        <boxGeometry args={[width, WALL_H, 0.18]} />
        <meshStandardMaterial color={WALL_COL} roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Zócalo LED rosa — base de la pared */}
      <mesh position={[0, 0.05, 0.1]}>
        <boxGeometry args={[width, 0.07, 0.04]} />
        <meshStandardMaterial color="#ff4d8d" emissive="#ff4d8d" emissiveIntensity={5} />
      </mesh>

      {/* Franja horizontal a media altura */}
      <mesh position={[0, WALL_H * 0.55, 0.1]}>
        <boxGeometry args={[width, 0.04, 0.03]} />
        <meshStandardMaterial color="#ff4d8d" emissive="#ff4d8d" emissiveIntensity={3} />
      </mesh>

      {/* Paneles verticales decorativos */}
      {[-10, -7, -4, -1, 2, 5, 8, 11].map(x => (
        <mesh key={x} position={[x, WALL_H * 0.55, 0.1]}>
          <boxGeometry args={[0.07, WALL_H * 0.9, 0.04]} />
          <meshStandardMaterial color={PANEL_COL} roughness={0.6} metalness={0.3} />
        </mesh>
      ))}

      {/* Ventanas/pantallas: rectángulos brillantes */}
      {[-8.5, -2.5, 3.5, 9.5].map(x => (
        <group key={x} position={[x, WALL_H * 0.58, 0.1]}>
          {/* Marco */}
          <mesh>
            <boxGeometry args={[2.0, 1.2, 0.03]} />
            <meshStandardMaterial color={WALL_ACCENT} roughness={0.4} metalness={0.5} />
          </mesh>
          {/* Pantalla */}
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[1.85, 1.05]} />
            <meshStandardMaterial
              color="#000510"
              emissive="#1a3a6a"
              emissiveIntensity={0.8}
              roughness={0}
            />
          </mesh>
          {/* Línea superior de pantalla (neón azul) */}
          <mesh position={[0, 0.6, 0.025]}>
            <boxGeometry args={[1.85, 0.015, 0.01]} />
            <meshStandardMaterial color="#4466ff" emissive="#4466ff" emissiveIntensity={4} />
          </mesh>
        </group>
      ))}

      {/* Neones verticales azules intermedios */}
      {[-5.5, 0.5, 6.5].map(x => (
        <mesh key={`neon${x}`} position={[x, WALL_H * 0.62, 0.12]}>
          <boxGeometry args={[0.03, WALL_H * 0.52, 0.02]} />
          <meshStandardMaterial color="#4444ff" emissive="#4444ff" emissiveIntensity={2.5} />
        </mesh>
      ))}

      {/* Tira LED superior */}
      <mesh position={[0, WALL_H - 0.1, 0.1]}>
        <boxGeometry args={[width, 0.04, 0.03]} />
        <meshStandardMaterial color="#3355ff" emissive="#3355ff" emissiveIntensity={3} />
      </mesh>
    </group>
  )
}

// ─── Pared izquierda (x = -12) ───────────────────────────────────────────
function LeftWall() {
  const depth = 26
  return (
    <group position={[-12, 0, 0.5]}>
      {/* Panel principal */}
      <mesh receiveShadow position={[0, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, WALL_H, 0.18]} />
        <meshStandardMaterial color={WALL_COL} roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Zócalo LED */}
      <mesh position={[0.1, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, 0.07, 0.04]} />
        <meshStandardMaterial color="#ff4d8d" emissive="#ff4d8d" emissiveIntensity={5} />
      </mesh>

      {/* Franja horizontal a media altura */}
      <mesh position={[0.1, WALL_H * 0.55, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, 0.04, 0.03]} />
        <meshStandardMaterial color="#ff4d8d" emissive="#ff4d8d" emissiveIntensity={3} />
      </mesh>

      {/* Paneles horizontales decorativos */}
      {[0.8, 1.8, 2.9, 4.0].map(y => (
        <mesh key={y} position={[0.1, y, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[depth * 0.92, 0.04, 0.03]} />
          <meshStandardMaterial color={WALL_ACCENT} roughness={0.6} metalness={0.3} />
        </mesh>
      ))}

      {/* Etiquetas de zona en la pared izquierda */}
      <ZoneLabel z={-7}  text="DIRECTION" color="#FF8C00" />
      <ZoneLabel z={-2}  text="TREND HUNTERS" color="#4466ff" />
      <ZoneLabel z={3}   text="CONTENT" color="#00FF88" />
      <ZoneLabel z={8}   text="QA" color="#FF2D55" />

      {/* Tira LED superior */}
      <mesh position={[0.1, WALL_H - 0.1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, 0.04, 0.03]} />
        <meshStandardMaterial color="#3355ff" emissive="#3355ff" emissiveIntensity={3} />
      </mesh>
    </group>
  )
}

// ─── Etiqueta de zona en la pared izquierda ───────────────────────────────
interface ZoneLabelProps {
  z: number; text: string; color: string
}
function ZoneLabel({ z, text, color }: ZoneLabelProps) {
  // Placa rectangular con color de zona
  return (
    <group position={[0.12, 1.8, z]}>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[2.8, 0.35, 0.04]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.3} />
      </mesh>
    </group>
  )
}
