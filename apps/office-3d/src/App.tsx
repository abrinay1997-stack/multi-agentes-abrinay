import { useEffect, useState } from 'react'
import { Scene } from './core/Scene'
import { SceneErrorBoundary } from './core/SceneErrorBoundary'
import { Dashboard } from './ui/Dashboard'
import { ConnectionBadge } from './ui/ConnectionBadge'
import { RunControls } from './ui/RunControls'
import { AgentPopup } from './ui/AgentPopup'
import { connectWS, disconnectWS } from './ws/wsClient'
import { useAgentStore } from './store/agentStore'
import type { CharacterName } from '@abrinay/shared-types'

// WS: en dev usa proxy Vite (/ws → :8080). En prod usa VITE_WS_URL (wss://backend.railway.app/ws)
// Fallback automático si VITE_WS_URL no está: mismo host que el frontend (útil si backend sirve el frontend)
const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_URL = import.meta.env.VITE_WS_URL ?? `${wsProto}//${window.location.host}/ws`

// API: en dev → '' + '/api' → proxy Vite. En prod → 'https://backend.railway.app' + '/api'
const API_BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

export default function App() {
  const [selectedAgent, setSelectedAgent] = useState<CharacterName | null>(null)

  // Iniciar conexión WS al montar — singleton, se limpia al desmontar
  useEffect(() => {
    connectWS(WS_URL)
    return () => disconnectWS()
  }, [])

  // Cargar último run histórico al montar — pre-popula Zustand con datos reales.
  // Guard anti-race: si el WS ya emitió pipeline:start antes de que esta llamada
  // HTTP termine, descartamos el histórico para no mezclar runs distintos (C4).
  useEffect(() => {
    fetch(`${API_BASE}/run/latest`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.outputs) return
        // Si hay un pipeline activo (WS más rápido que HTTP) → no sobreescribir
        if (useAgentStore.getState().currentRunId) return
        // Reconstruir estado de agentes desde outputs históricos
        const agents = useAgentStore.getState().agents
        const next = { ...agents }
        for (const output of data.outputs as Array<{ agentName: string; outputType: string }>) {
          next[output.agentName] = {
            status: 'complete',
            thinkingMessage: null,
            lastOutput: output.outputType,
            walkTarget: null,
          }
        }
        useAgentStore.setState({ agents: next })
      })
      .catch(() => { /* servidor no disponible — modo offline, no hay historial */ })
  }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#0a0a0a' }}>

      {/* Escena 3D — ocupa todo el viewport (protegida por ErrorBoundary) */}
      <SceneErrorBoundary>
        <Scene onSelectAgent={setSelectedAgent} />
      </SceneErrorBoundary>

      {/* Dashboard lateral derecho — estados de los 11 agentes */}
      <Dashboard />

      {/* Barra inferior izquierda: badge + controles */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'flex-start',
      }}>
        <ConnectionBadge />
        <RunControls />
      </div>

      {/* Popup de agente seleccionado */}
      {selectedAgent && (
        <AgentPopup
          agentName={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}


    </div>
  )
}
