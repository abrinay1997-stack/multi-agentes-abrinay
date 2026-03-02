import { Router } from 'express'
import { orchestrator } from './pipeline/orchestrator'
import { runPipeline } from './pipeline/runner'
import { getLatestRun, getLatestRunOutputs } from './db/queries'
import { getLockStatus } from './db/lock'
import { getDb } from './db/client'
import { getAllAgentConfigs, getAgentConfig, upsertAgentConfig, resetAgentConfig } from './db/agentConfigs'
import type { AgentName } from '@abrinay/shared-types'

export const router = Router()

// ─── Validación de agentName ────────────────────────────────────────────────

// Allowlist explícita — rechaza cualquier nombre no conocido (path traversal, names aleatorios)
const VALID_AGENT_NAMES = new Set<string>([
  'scout', 'kira', 'cleo', 'orion', 'nova', 'zane', 'milo',
  'leo', 'vera', 'stella', 'atlas', 'dimitri',
])

// Sanitiza el body de PUT /configs/:name — coerciona tipos para evitar
// que strings inválidos (ej: temperature="caliente") corrompan la DB SQLite
function sanitizeConfigBody(body: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {}

  if ('systemPrompt' in body)
    safe.systemPrompt = body.systemPrompt == null ? null : String(body.systemPrompt)
  if ('memoryNotes' in body)
    safe.memoryNotes = body.memoryNotes == null ? null : String(body.memoryNotes)
  if ('abrinayProfile' in body)
    safe.abrinayProfile = body.abrinayProfile == null ? null : String(body.abrinayProfile)

  if ('tavilyQueries' in body)
    safe.tavilyQueries = Array.isArray(body.tavilyQueries) ? body.tavilyQueries.map(String) : null
  if ('rulesAlways' in body)
    safe.rulesAlways = Array.isArray(body.rulesAlways) ? body.rulesAlways.map(String) : null
  if ('rulesNever' in body)
    safe.rulesNever = Array.isArray(body.rulesNever) ? body.rulesNever.map(String) : null

  if ('maxRetries' in body) {
    const v = parseInt(String(body.maxRetries), 10)
    safe.maxRetries = isNaN(v) ? 1 : Math.max(0, Math.min(v, 10))
  }
  if ('scoreThreshold' in body) {
    const v = parseFloat(String(body.scoreThreshold))
    safe.scoreThreshold = isNaN(v) ? 8.0 : Math.max(1.0, Math.min(v, 10.0))
  }
  if ('temperature' in body) {
    const v = parseFloat(String(body.temperature))
    safe.temperature = isNaN(v) ? 0.7 : Math.max(0.0, Math.min(v, 2.0))
  }

  return safe
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0' })
})

router.get('/status', (_req, res) => {
  res.json({
    pipelineState: orchestrator.getState(),
    currentRunId: orchestrator.getCurrentRunId(),
    lock: getLockStatus(),
  })
})

router.get('/run/latest', (_req, res) => {
  const latest = getLatestRun()
  if (!latest) {
    return res.json({ runId: null, outputs: [] })
  }
  // Devolver todos los outputs del último run para precargar Zustand en el frontend
  const outputs = getDb().prepare(
    `SELECT agent_name AS agentName, output_type AS outputType
     FROM squad_outputs WHERE run_id = ? AND status = 'completed'`
  ).all(latest.runId) as Array<{ agentName: string; outputType: string }>
  res.json({ runId: latest.runId, createdAt: latest.createdAt, outputs })
})

router.get('/agents/:name', (req, res) => {
  if (!VALID_AGENT_NAMES.has(req.params.name)) {
    return res.status(400).json({ ok: false, error: 'Agente desconocido' })
  }
  const agentName = req.params.name as AgentName
  const outputs = getLatestRunOutputs(agentName)
  res.json({ agentName, outputs })
})

router.post('/run', async (_req, res) => {
  const result = await runPipeline()
  res.status(result.started ? 202 : 409).json(result)
})

// ─── Configuración de agentes ──────────────────────────────────────────────

router.get('/configs', (_req, res) => {
  res.json(getAllAgentConfigs())
})

router.get('/configs/:name', (req, res) => {
  if (!VALID_AGENT_NAMES.has(req.params.name)) {
    return res.status(400).json({ ok: false, error: 'Agente desconocido' })
  }
  try {
    res.json(getAgentConfig(req.params.name))
  } catch (e) {
    console.error('[api] GET /configs/:name error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})

router.put('/configs/:name', (req, res) => {
  if (!VALID_AGENT_NAMES.has(req.params.name)) {
    return res.status(400).json({ ok: false, error: 'Agente desconocido' })
  }
  try {
    // sanitizeConfigBody coerciona y valida todos los tipos del body antes de persistir
    const safe = sanitizeConfigBody(req.body as Record<string, unknown>)
    upsertAgentConfig(req.params.name, safe)
    res.json({ ok: true, config: getAgentConfig(req.params.name) })
  } catch (e) {
    console.error('[api] PUT /configs/:name error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})

router.post('/configs/:name/reset', (req, res) => {
  if (!VALID_AGENT_NAMES.has(req.params.name)) {
    return res.status(400).json({ ok: false, error: 'Agente desconocido' })
  }
  try {
    resetAgentConfig(req.params.name)
    res.json({ ok: true, config: getAgentConfig(req.params.name) })
  } catch (e) {
    console.error('[api] POST /configs/:name/reset error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})
