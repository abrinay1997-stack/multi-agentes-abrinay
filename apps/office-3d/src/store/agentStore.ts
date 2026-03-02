import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { AgentEvent, AgentName, AgentStatus, CharacterName, RunSummary } from '@abrinay/shared-types'
import { DELIVERY_TARGETS, QA_REVISION_TARGETS } from '../characters/movements'
import { AGENT_POSITIONS } from '../characters/positions'

// En dev: VITE_API_URL no existe → '' → '/api' usa el proxy de Vite → :3001
// En prod (GitHub Pages): VITE_API_URL='https://backend.railway.app' → llamada directa
const API_BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

// Mirror del schema backend (camelCase)
export interface AgentConfig {
  agentName: string
  systemPrompt: string | null
  tavilyQueries: string[] | null
  rulesAlways: string[] | null
  rulesNever: string[] | null
  memoryNotes: string | null
  abrinayProfile: string | null
  maxRetries: number
  scoreThreshold: number
  temperature: number
  updatedAt: string
}

export interface AgentState {
  status: AgentStatus
  thinkingMessage: string | null
  lastOutput: string | null
  // walkTarget: posición absoluta adonde debe ir (null = en casa)
  walkTarget: [number, number, number] | null
}

interface AgentStore {
  agents: Record<string, AgentState>
  wsStatus: 'connecting' | 'connected' | 'offline'
  currentRunId: string | null
  pipelineStep: number
  totalSteps: number         // recibido del backend en pipeline:progress
  lastRunSummary: RunSummary | null  // resumen del último run completado (para notificaciones)

  // Config editor
  agentConfigs: Record<string, AgentConfig>
  configLoadingFor: string | null   // nombre del agente en operación, null = libre
  configError: string | null

  setWsStatus: (s: AgentStore['wsStatus']) => void
  handleWsEvent: (e: AgentEvent) => void
  resetAgents: () => void
  clearWalkTarget: (name: CharacterName) => void

  loadConfig: (name: string) => Promise<void>
  saveConfig: (name: string, config: Partial<AgentConfig>) => Promise<void>
  resetConfig: (name: string) => Promise<void>
}

const defaultAgentState = (): AgentState => ({
  status: 'idle',
  thinkingMessage: null,
  lastOutput: null,
  walkTarget: null,
})

// Programa el movimiento de un agente con delay — llamado desde handleWsEvent
function scheduleWalk(name: CharacterName, targetName: CharacterName, delayMs: number) {
  const target = AGENT_POSITIONS[targetName]
  if (!target) return
  setTimeout(() => {
    useAgentStore.setState((s) => ({
      agents: {
        ...s.agents,
        [name]: {
          ...(s.agents[name] ?? defaultAgentState()),
          walkTarget: target,
        },
      },
    }))
  }, delayMs)
}

export const useAgentStore = create<AgentStore>()(
  subscribeWithSelector((set) => ({
    agents: {},
    wsStatus: 'connecting',
    currentRunId: null,
    pipelineStep: 0,
    totalSteps: 10,          // valor por defecto conservador (TOTAL_STEPS del orchestrator)
    lastRunSummary: null,

    agentConfigs: {},
    configLoadingFor: null,
    configError: null,

    setWsStatus: (wsStatus) => set({ wsStatus }),

    clearWalkTarget: (name) =>
      set((s) => ({
        agents: {
          ...s.agents,
          [name]: { ...(s.agents[name] ?? defaultAgentState()), walkTarget: null },
        },
      })),

    loadConfig: async (name) => {
      set({ configLoadingFor: name, configError: null })
      try {
        const res = await fetch(`${API_BASE}/configs/${name}`)
        if (!res.ok) {
          // Intentar extraer el mensaje de error del body JSON antes de lanzar
          const body = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
        const cfg = await res.json() as AgentConfig
        set((s) => ({
          agentConfigs: { ...s.agentConfigs, [name]: cfg },
          configLoadingFor: null,
        }))
      } catch (err) {
        set({ configLoadingFor: null, configError: String(err) })
      }
    },

    saveConfig: async (name, config) => {
      set({ configLoadingFor: name, configError: null })
      try {
        const res = await fetch(`${API_BASE}/configs/${name}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as { ok: boolean; config: AgentConfig }
        set((s) => ({
          agentConfigs: { ...s.agentConfigs, [name]: data.config },
          configLoadingFor: null,
        }))
      } catch (err) {
        set({ configLoadingFor: null, configError: String(err) })
      }
    },

    resetConfig: async (name) => {
      set({ configLoadingFor: name, configError: null })
      try {
        const res = await fetch(`${API_BASE}/configs/${name}/reset`, { method: 'POST' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as { ok: boolean; config: AgentConfig }
        set((s) => ({
          agentConfigs: { ...s.agentConfigs, [name]: data.config },
          configLoadingFor: null,
        }))
      } catch (err) {
        set({ configLoadingFor: null, configError: String(err) })
      }
    },

    handleWsEvent: (e: AgentEvent) => {
      set((state) => {
        switch (e.type) {
          case 'pipeline:start':
            return { currentRunId: e.runId, pipelineStep: 0 }

          case 'pipeline:complete':
            return { currentRunId: null, pipelineStep: 0, lastRunSummary: e.summary }

          case 'pipeline:progress':
            return { pipelineStep: e.step, totalSteps: e.totalSteps }

          case 'agent:start': {
            const agents = { ...state.agents }
            const name = e.agentName as AgentName
            agents[name] = { ...defaultAgentState(), status: 'typing' }
            return { agents }
          }

          case 'agent:thinking': {
            const agents = { ...state.agents }
            const name = e.agentName as AgentName
            agents[name] = {
              ...(agents[name] ?? defaultAgentState()),
              status: 'typing',
              thinkingMessage: e.message,
            }
            return { agents }
          }

          case 'agent:complete': {
            const agents = { ...state.agents }
            const name = e.agentName as AgentName
            agents[name] = {
              ...(agents[name] ?? defaultAgentState()),
              status: 'complete',
              thinkingMessage: null,
              lastOutput: e.outputType,
            }

            // Programar movimiento de entrega después de la animación de celebración
            const deliverTo = DELIVERY_TARGETS[name as CharacterName]
            if (deliverTo) {
              scheduleWalk(name as CharacterName, deliverTo, 900)
            }

            return { agents }
          }

          case 'agent:error': {
            const agents = { ...state.agents }
            const name = e.agentName as AgentName
            agents[name] = {
              ...(agents[name] ?? defaultAgentState()),
              status: 'error',
              thinkingMessage: e.error,
            }
            return { agents }
          }

          case 'qa:revision': {
            const agents = { ...state.agents }
            const qaName = e.agentName
            agents[qaName] = {
              ...(agents[qaName] ?? defaultAgentState()),
              status: 'typing',
              thinkingMessage: `Revisando ${e.pieceId} (score: ${e.score.toFixed(1)})`,
            }

            // QA va inmediatamente al despacho del content creator para pedir revisión
            const revTarget = QA_REVISION_TARGETS[qaName]
            if (revTarget) {
              scheduleWalk(qaName, revTarget, 300)
            }

            return { agents }
          }

          default:
            return state
        }
      })
    },

    resetAgents: () => set({ agents: {}, currentRunId: null, pipelineStep: 0, totalSteps: 10, lastRunSummary: null }),
  }))
)
