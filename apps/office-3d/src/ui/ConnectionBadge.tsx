import { useAgentStore } from '../store/agentStore'

const STATUS_LABEL: Record<string, string> = {
  connected: '● Conectado',
  connecting: '◌ Conectando...',
  offline: '○ Desconectado',
}

const STATUS_COLOR: Record<string, string> = {
  connected: '#00ff88',
  connecting: '#ffcc00',
  offline: '#ff4d8d',
}

// URL del WS para mostrar en tooltip — misma lógica que App.tsx (M4)
const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_DISPLAY_URL = import.meta.env.VITE_WS_URL ?? `${wsProto}//${window.location.host}/ws`

export function ConnectionBadge() {
  const wsStatus = useAgentStore((s) => s.wsStatus)
  const color = STATUS_COLOR[wsStatus] ?? '#888'

  const tooltipText =
    wsStatus === 'connected'  ? `Conectado a ${WS_DISPLAY_URL}` :
    wsStatus === 'connecting' ? `Intentando conectar a ${WS_DISPLAY_URL}...` :
                                `Sin conexión — servidor en ${WS_DISPLAY_URL}`

  return (
    <div
      title={tooltipText}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: 'rgba(0,0,0,0.75)',
        border: `1px solid ${color}`,
        borderRadius: 20,
        fontFamily: 'monospace',
        fontSize: 11,
        color,
        userSelect: 'none',
        letterSpacing: '0.04em',
        cursor: 'default',
      }}>
      {STATUS_LABEL[wsStatus] ?? 'Desconocido'}
    </div>
  )
}
