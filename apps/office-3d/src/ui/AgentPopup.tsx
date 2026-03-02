import { useState } from 'react'
import { useAgentStore } from '../store/agentStore'
import { AGENT_COLORS } from '../characters/colors'
import { AgentEditorPanel } from './AgentEditorPanel'
import type { CharacterName } from '@abrinay/shared-types'

interface AgentPopupProps {
  agentName: CharacterName
  onClose: () => void
}

const STATUS_ICON: Record<string, string> = {
  idle: '○',
  typing: '◉',
  complete: '✓',
  error: '✗',
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'En espera',
  typing: 'Trabajando',
  complete: 'Completado',
  error: 'Error',
}

export function AgentPopup({ agentName, onClose }: AgentPopupProps) {
  const agentState = useAgentStore((s) => s.agents[agentName])
  const loadConfig = useAgentStore((s) => s.loadConfig)
  const agentConfigs = useAgentStore((s) => s.agentConfigs)
  const color = AGENT_COLORS[agentName]

  const [activeTab, setActiveTab] = useState<'status' | 'edit'>('status')
  // isDirty: el AgentEditorPanel lo propaga hacia arriba via onDirtyChange
  const [isDirty, setIsDirty] = useState(false)
  // showConfirm: reemplaza window.confirm() con overlay inline para mantener el diseño oscuro
  const [showConfirm, setShowConfirm] = useState(false)

  const status = agentState?.status ?? 'idle'
  const message = agentState?.thinkingMessage
  const lastOutput = agentState?.lastOutput

  const handleTabChange = (tab: 'status' | 'edit') => {
    if (tab === 'edit' && !agentConfigs[agentName]) {
      // Solo cargar si no está ya en el store — evita sobreescribir draft no guardado
      loadConfig(agentName)
    }
    setActiveTab(tab)
  }

  const handleClose = () => {
    if (isDirty) {
      setShowConfirm(true)  // mostrar overlay inline en lugar de window.confirm()
      return
    }
    onClose()
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 320,
      background: 'rgba(8,8,12,0.97)',
      border: `1px solid ${color}`,
      borderRadius: 10,
      padding: '14px 16px',
      fontFamily: 'monospace',
      color: '#e0e0e0',
      zIndex: 20,
      boxShadow: `0 0 24px ${color}44`,
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ color, fontWeight: 700, fontSize: 14, letterSpacing: '0.06em' }}>
          {agentName.charAt(0).toUpperCase() + agentName.slice(1)}
        </span>
        <button
          onClick={handleClose}
          style={{
            background: 'none', border: 'none', color: '#666',
            cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px',
          }}
        >✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: 12, borderBottom: '1px solid #222' }}>
        {(['status', 'edit'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${color}` : '2px solid transparent',
              color: activeTab === tab ? color : '#555',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'monospace',
              padding: '4px 12px 6px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: -1,
              transition: 'color 0.15s',
            }}
          >
            {tab === 'status' ? 'Estado' : 'Editar'}
          </button>
        ))}
      </div>

      {/* Overlay de confirmación — reemplaza window.confirm() para mantener diseño oscuro */}
      {showConfirm && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.88)',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          zIndex: 100,
          padding: '24px',
        }}>
          <div style={{ fontSize: 18, marginBottom: 2 }}>⚠️</div>
          <div style={{
            fontSize: 12, color: '#ccc',
            textAlign: 'center', lineHeight: 1.6,
            fontFamily: 'monospace',
          }}>
            ¿Cerrar sin guardar los cambios?
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={() => { setShowConfirm(false); setIsDirty(false); onClose() }}
              style={{
                background: 'rgba(255,77,141,0.12)',
                border: '1px solid #ff4d8d',
                color: '#ff4d8d',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'monospace',
                padding: '7px 16px',
                borderRadius: 4,
                letterSpacing: '0.06em',
              }}
            >
              Cerrar
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #333',
                color: '#666',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'monospace',
                padding: '7px 16px',
                borderRadius: 4,
                letterSpacing: '0.06em',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tab content — scrollable */}
      <div style={{ overflowY: 'auto', flex: 1 }}>

        {activeTab === 'status' ? (
          <>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12 }}>
              <span style={{
                color: status === 'complete' ? '#00ff88' : status === 'error' ? '#ff4d8d' : status === 'typing' ? color : '#555',
              }}>
                {STATUS_ICON[status]} {STATUS_LABEL[status]}
              </span>
            </div>

            {/* Thinking message */}
            {message && (
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #222',
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 11,
                color: '#bbb',
                marginBottom: 6,
                lineHeight: 1.5,
              }}>
                💭 {message}
              </div>
            )}

            {/* Last output */}
            {lastOutput && !message && (
              <div style={{ fontSize: 11, color: '#555' }}>
                Último output: <span style={{ color: '#888' }}>{lastOutput}</span>
              </div>
            )}

            {/* Idle state message */}
            {!message && !lastOutput && status === 'idle' && (
              <div style={{ fontSize: 11, color: '#444' }}>
                Esperando inicio del pipeline...
              </div>
            )}
          </>
        ) : (
          <AgentEditorPanel name={agentName} onDirtyChange={setIsDirty} />
        )}

      </div>
    </div>
  )
}
