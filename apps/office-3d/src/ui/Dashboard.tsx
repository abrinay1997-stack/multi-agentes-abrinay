import { useAgentStore } from '../store/agentStore'
import { AGENT_COLORS } from '../characters/colors'
import type { CharacterName } from '@abrinay/shared-types'

// Inyectar keyframe una sola vez al nivel de módulo — no dentro del render
;(function injectPulseOnce() {
  const id = '__abrinay_pulse_style__'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }'
  document.head.appendChild(style)
})()

// Dashboard lateral: muestra estado de los 11 agentes en tiempo real
const CHARACTER_NAMES: CharacterName[] = [
  'kira', 'cleo', 'orion', 'nova', 'zane', 'milo', 'leo', 'vera', 'stella', 'atlas', 'dimitri',
]

const STATUS_DOT: Record<string, string> = {
  idle: '#333',
  typing: '#ffcc00',
  complete: '#00ff88',
  error: '#ff4d8d',
}

export function Dashboard() {
  const agents = useAgentStore((s) => s.agents)
  const currentRunId = useAgentStore((s) => s.currentRunId)
  const pipelineStep = useAgentStore((s) => s.pipelineStep)
  const totalSteps = useAgentStore((s) => s.totalSteps)
  const lastRunSummary = useAgentStore((s) => s.lastRunSummary)

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      width: 180,
      background: 'rgba(4,4,8,0.88)',
      border: '1px solid #1a1a2e',
      borderRadius: 10,
      padding: '12px 14px',
      fontFamily: 'monospace',
      zIndex: 10,
      backdropFilter: 'blur(6px)',
    }}>
      {/* Header */}
      <div style={{ fontSize: 10, color: '#ff4d8d', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
        🎵 ABRINAY SQUAD
      </div>

      {/* Pipeline en curso */}
      {currentRunId && (
        <div style={{
          fontSize: 10, color: '#ffcc00', marginBottom: 8,
          padding: '4px 8px', background: 'rgba(255,204,0,0.08)',
          borderRadius: 4, border: '1px solid #332200',
        }}>
          ◉ Paso {pipelineStep} / {totalSteps}
        </div>
      )}

      {/* Resumen del último run (C7/M1): muestra resultado + estado del email */}
      {!currentRunId && lastRunSummary && (
        <div style={{
          fontSize: 10, marginBottom: 8,
          padding: '5px 8px',
          background: lastRunSummary.emailSent ? 'rgba(0,255,136,0.05)' : 'rgba(255,77,141,0.07)',
          borderRadius: 4,
          border: `1px solid ${lastRunSummary.emailSent ? '#0a2a18' : '#3a1022'}`,
          lineHeight: 1.6,
        }}>
          <span style={{ color: '#00ff88' }}>✓</span>
          <span style={{ color: '#666' }}> {lastRunSummary.totalApproved} aprobadas · {lastRunSummary.totalDiscarded} desc.</span>
          <br />
          {lastRunSummary.emailSent
            ? <span style={{ color: '#00bb55', fontSize: 9 }}>✉ Email enviado a Abrinay</span>
            : <span style={{ color: '#ff4d8d', fontSize: 9 }}>⚠ Email no enviado — ver logs</span>
          }
        </div>
      )}

      {/* Agent list */}
      {CHARACTER_NAMES.map((name) => {
        const state = agents[name]
        const status = state?.status ?? 'idle'
        const dotColor = STATUS_DOT[status] ?? '#333'
        const agentColor = AGENT_COLORS[name]

        return (
          <div
            key={name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '3px 0',
              borderBottom: '1px solid #0d0d14',
            }}
          >
            {/* Status dot */}
            <div style={{
              width: 7, height: 7,
              borderRadius: '50%',
              background: dotColor,
              flexShrink: 0,
              boxShadow: status === 'typing' ? `0 0 6px ${dotColor}` : 'none',
              transition: 'background 0.3s, box-shadow 0.3s',
            }} />
            {/* Name */}
            <span style={{
              fontSize: 11,
              color: status === 'idle' ? '#444' : agentColor,
              flex: 1,
              letterSpacing: '0.03em',
              transition: 'color 0.3s',
            }}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </span>
            {/* Typing indicator */}
            {status === 'typing' && (
              <span style={{ fontSize: 9, color: dotColor, animation: 'pulse 1s infinite' }}>
                ···
              </span>
            )}
          </div>
        )
      })}

    </div>
  )
}
