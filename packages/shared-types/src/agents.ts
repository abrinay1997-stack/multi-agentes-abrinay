export type AgentName =
  | 'scout'
  | 'kira'
  | 'cleo'
  | 'orion'
  | 'nova'
  | 'zane'
  | 'milo'
  | 'leo'
  | 'vera'
  | 'stella'
  | 'atlas'
  | 'dimitri'

// Los 11 personajes con representación 3D (Scout es invisible)
export type CharacterName = Exclude<AgentName, 'scout'>

export type QaAgentName = 'vera' | 'stella' | 'atlas'

export type AgentStatus = 'idle' | 'typing' | 'complete' | 'error'

export interface AgentOutputRecord {
  id?: number
  run_id: string
  agent_name: AgentName
  output_type: string
  content: string  // siempre JSON.stringify()'d
  status?: string
  created_at?: string
}
