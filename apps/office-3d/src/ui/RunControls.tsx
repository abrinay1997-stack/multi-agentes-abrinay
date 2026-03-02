import { useState } from 'react'
import { useAgentStore } from '../store/agentStore'

export function RunControls() {
  const wsStatus = useAgentStore((s) => s.wsStatus)
  const currentRunId = useAgentStore((s) => s.currentRunId)
  const pipelineStep = useAgentStore((s) => s.pipelineStep)
  const totalSteps = useAgentStore((s) => s.totalSteps)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRunning = !!currentRunId
  const isOffline = wsStatus === 'offline'
  const disabled = isOffline || isRunning || loading

  async function handleRun() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/run', { method: 'POST' })
      // Parsear siempre el body — el servidor devuelve JSON incluso en errores
      const body = await res.json().catch(() => ({})) as { started?: boolean; message?: string; error?: string }
      if (!res.ok || body.started === false) {
        // Mostrar mensaje del servidor si existe (ej: "Pipeline en ejecución: estado actual running_scout")
        setError(body.message ?? body.error ?? `HTTP ${res.status}`)
      }
    } catch {
      setError('No se pudo contactar al servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        onClick={handleRun}
        disabled={disabled}
        title={
          isOffline  ? 'Servidor no disponible' :
          isRunning  ? `Pipeline en curso (paso ${pipelineStep} de ${totalSteps})` :
                       'Ejecutar pipeline ahora'
        }
        style={{
          padding: '7px 18px',
          background: disabled ? '#1a1a1a' : '#ff4d8d',
          color: disabled ? '#444' : '#fff',
          border: `1px solid ${disabled ? '#333' : '#ff4d8d'}`,
          borderRadius: 6,
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 700,
          cursor: disabled ? 'not-allowed' : 'pointer',
          letterSpacing: '0.05em',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {loading ? 'Iniciando...' : isRunning ? `Ejecutando (${pipelineStep}/${totalSteps})` : '▶ Ejecutar ahora'}
      </button>

      {error && (
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#ff4d8d' }}>
          ⚠ {error}
        </span>
      )}
    </div>
  )
}
