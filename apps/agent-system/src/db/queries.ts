import { getDb } from './client'
import type { AgentName } from '@abrinay/shared-types'

// ─── squad_outputs ───────────────────────────────────────────────

export function saveAgentOutput(params: {
  runId: string
  agentName: AgentName
  outputType: string
  content: unknown
  status?: string
}): number {
  const result = getDb().prepare(`
    INSERT INTO squad_outputs (run_id, agent_name, output_type, content, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    params.runId,
    params.agentName,
    params.outputType,
    JSON.stringify(params.content),
    params.status ?? 'completed'
  )
  return result.lastInsertRowid as number
}

export function getAgentOutput(
  runId: string,
  agentName: AgentName,
  outputType: string
): unknown | null {
  const row = getDb().prepare(`
    SELECT content FROM squad_outputs
    WHERE run_id = ? AND agent_name = ? AND output_type = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(runId, agentName, outputType) as { content: string } | undefined

  if (!row) return null
  return JSON.parse(row.content)
}

export function getLatestRunOutputs(agentName: AgentName): {
  outputType: string
  content: unknown
  createdAt: string
}[] {
  // Filtrar por el run_id más reciente de este agente — evita mezclar outputs
  // de ejecuciones históricas distintas (NM4: antes retornaba 20 rows de todos los runs)
  const latestRun = getDb().prepare(`
    SELECT run_id FROM squad_outputs
    WHERE agent_name = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(agentName) as { run_id: string } | undefined

  if (!latestRun) return []

  const rows = getDb().prepare(`
    SELECT output_type, content, created_at
    FROM squad_outputs
    WHERE agent_name = ? AND run_id = ?
    ORDER BY created_at DESC
  `).all(agentName, latestRun.run_id) as { output_type: string; content: string; created_at: string }[]

  return rows.map(r => ({
    outputType: r.output_type,
    content: JSON.parse(r.content),
    createdAt: r.created_at,
  }))
}

// ─── error_log ───────────────────────────────────────────────────

export function logError(params: {
  runId: string
  agentName: string
  errorType: string
  errorDetail: string
  fallbackUsed?: string
}): void {
  getDb().prepare(`
    INSERT INTO error_log (run_id, agent_name, error_type, error_detail, fallback_used)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    params.runId,
    params.agentName,
    params.errorType,
    params.errorDetail,
    params.fallbackUsed ?? null
  )
}

// ─── content_history ─────────────────────────────────────────────

export interface ContentHistoryRow {
  runId: string
  fecha: string
  plataforma: 'TikTok' | 'Instagram' | 'YouTube'
  formato: string
  titulo: string
  hook: string
  scoreGeneral?: number
  scoreHook?: number
  scoreCtr?: number
  hashtags?: string
  audioSugerido?: string
  status: 'aprobado' | 'descartado'
  razonDescarte?: string
  licenciaP?: 0 | 1
}

export function insertContentHistory(row: ContentHistoryRow): void {
  getDb().prepare(`
    INSERT INTO content_history
      (run_id, fecha, plataforma, formato, titulo, hook,
       score_general, score_hook, score_ctr,
       hashtags, audio_sugerido, status, razon_descarte, licencia_p)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.runId, row.fecha, row.plataforma, row.formato, row.titulo, row.hook,
    row.scoreGeneral ?? null,
    row.scoreHook ?? null,
    row.scoreCtr ?? null,
    row.hashtags ?? null,
    row.audioSugerido ?? null,
    row.status,
    row.razonDescarte ?? null,
    row.licenciaP ?? 1
  )
}

export interface ContentHistoryEntry {
  score_general: number | null
  score_hook: number | null
  score_ctr: number | null
  hook: string | null       // texto real del hook para anti-repetición (nova.ts)
  formato: string | null    // formato de la pieza (video_corto, reel, carrusel, etc.)
}

export function getContentHistory(
  plataforma: 'TikTok' | 'Instagram' | 'YouTube',
  limit = 10
): ContentHistoryEntry[] {
  // hook y formato incluidos para que nova.ts pueda evitar repetir ganchos/formatos reales
  return getDb().prepare(`
    SELECT score_general, score_hook, score_ctr, hook, formato
    FROM content_history
    WHERE plataforma = ? AND status = 'aprobado'
    ORDER BY created_at DESC LIMIT ?
  `).all(plataforma, limit) as ContentHistoryEntry[]
}

// ─── Resumen de runs ──────────────────────────────────────────────

export function getLatestRun(): { runId: string; createdAt: string } | null {
  // Obtener la fila con el created_at más reciente directamente — evita
  // GROUP BY con MAX() que en SQLite puede retornar valores de filas distintas
  // si dos runs tienen el mismo timestamp (G4 de la auditoría).
  const row = getDb().prepare(`
    SELECT run_id, created_at
    FROM squad_outputs
    ORDER BY created_at DESC LIMIT 1
  `).get() as { run_id: string; created_at: string } | undefined

  if (!row) return null
  return { runId: row.run_id, createdAt: row.created_at }
}
