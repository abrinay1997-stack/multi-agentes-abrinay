import type { AgentName, QaAgentName } from './agents'

export interface RunSummary {
  runId: string
  totalApproved: number
  totalDiscarded: number
  emailSent: boolean
  duration: number
}

export type AgentEvent =
  | { type: 'pipeline:start';    runId: string; timestamp: number }
  | { type: 'pipeline:complete'; runId: string; timestamp: number; summary: RunSummary }
  | { type: 'pipeline:progress'; runId: string; step: number; totalSteps: number }
  | { type: 'agent:start';       agentName: AgentName; runId: string }
  | { type: 'agent:thinking';    agentName: AgentName; message: string }
  | { type: 'agent:complete';    agentName: AgentName; outputType: string }
  | { type: 'agent:error';       agentName: AgentName; error: string }
  | { type: 'qa:revision';       agentName: QaAgentName; pieceId: string; score: number }
