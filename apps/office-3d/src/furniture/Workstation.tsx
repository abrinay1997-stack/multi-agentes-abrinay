import { Desk } from './Desk'
import { Chair } from './Chair'
import { Monitor } from './Monitor'

interface WorkstationProps {
  position: [number, number, number]
  color: string
}

// Estación de trabajo completa: mesa + monitor + silla
// El agente (personaje) se añade en FASE 4, centrado en [position]
export function Workstation({ position, color }: WorkstationProps) {
  const [x, y, z] = position

  return (
    <group>
      {/* Mesa: levemente detrás del agente */}
      <group position={[x, y, z - 0.5]}>
        <Desk />
        {/* Monitor sobre la mesa */}
        <group position={[0, 0.76 + 0.36, -0.28]}>
          <Monitor color={color} />
        </group>
      </group>

      {/* Silla: frente a la mesa, entre la mesa y el agente */}
      <group position={[x, y, z + 0.38]}>
        <Chair />
      </group>
    </group>
  )
}
