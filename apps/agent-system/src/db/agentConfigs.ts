import { getDb } from './client'

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

interface DbRow {
  agent_name: string
  system_prompt: string | null
  tavily_queries: string | null
  rules_always: string | null
  rules_never: string | null
  memory_notes: string | null
  abrinay_profile: string | null
  max_retries: number
  score_threshold: number
  temperature: number
  updated_at: string
}

function rowToConfig(agentName: string, row?: DbRow): AgentConfig {
  if (!row) {
    return {
      agentName,
      systemPrompt: null,
      tavilyQueries: null,
      rulesAlways: null,
      rulesNever: null,
      memoryNotes: null,
      abrinayProfile: null,
      maxRetries: 1,
      scoreThreshold: 8.0,
      temperature: 0.7,
      updatedAt: new Date().toISOString(),
    }
  }
  return {
    agentName: row.agent_name,
    systemPrompt: row.system_prompt,
    tavilyQueries: row.tavily_queries ? JSON.parse(row.tavily_queries) : null,
    rulesAlways: row.rules_always ? JSON.parse(row.rules_always) : null,
    rulesNever: row.rules_never ? JSON.parse(row.rules_never) : null,
    memoryNotes: row.memory_notes,
    abrinayProfile: row.abrinay_profile,
    maxRetries: row.max_retries,
    scoreThreshold: row.score_threshold,
    temperature: row.temperature,
    updatedAt: row.updated_at,
  }
}

export function getAgentConfig(agentName: string): AgentConfig {
  const row = getDb()
    .prepare('SELECT * FROM agent_configs WHERE agent_name = ?')
    .get(agentName) as DbRow | undefined
  return rowToConfig(agentName, row)
}

export function getAllAgentConfigs(): AgentConfig[] {
  const rows = getDb()
    .prepare('SELECT * FROM agent_configs ORDER BY agent_name')
    .all() as DbRow[]
  return rows.map(r => rowToConfig(r.agent_name, r))
}

export function upsertAgentConfig(
  agentName: string,
  partial: Partial<Omit<AgentConfig, 'agentName' | 'updatedAt'>>
): void {
  const db = getDb()
  const existing = db
    .prepare('SELECT * FROM agent_configs WHERE agent_name = ?')
    .get(agentName) as DbRow | undefined
  const base = rowToConfig(agentName, existing)
  const merged = { ...base, ...partial }

  db.prepare(`
    INSERT INTO agent_configs
      (agent_name, system_prompt, tavily_queries, rules_always, rules_never,
       memory_notes, abrinay_profile, max_retries, score_threshold, temperature)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_name) DO UPDATE SET
      system_prompt   = excluded.system_prompt,
      tavily_queries  = excluded.tavily_queries,
      rules_always    = excluded.rules_always,
      rules_never     = excluded.rules_never,
      memory_notes    = excluded.memory_notes,
      abrinay_profile = excluded.abrinay_profile,
      max_retries     = excluded.max_retries,
      score_threshold = excluded.score_threshold,
      temperature     = excluded.temperature,
      updated_at      = CURRENT_TIMESTAMP
  `).run(
    agentName,
    merged.systemPrompt ?? null,
    // .length en lugar de truthiness — [] (array vacío) es truthy pero debe guardarse como NULL (NM5)
    merged.tavilyQueries?.length ? JSON.stringify(merged.tavilyQueries) : null,
    merged.rulesAlways?.length   ? JSON.stringify(merged.rulesAlways)   : null,
    merged.rulesNever?.length    ? JSON.stringify(merged.rulesNever)    : null,
    merged.memoryNotes ?? null,
    merged.abrinayProfile ?? null,
    merged.maxRetries,
    merged.scoreThreshold,
    merged.temperature,
  )
}

export function resetAgentConfig(agentName: string): void {
  getDb()
    .prepare('DELETE FROM agent_configs WHERE agent_name = ?')
    .run(agentName)
}
