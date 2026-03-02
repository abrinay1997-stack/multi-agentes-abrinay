import { BaseAgent, type RunContext } from '../base'
import { callClaude } from '../../services/claude'
import { getAgentOutput, getContentHistory, saveAgentOutput } from '../../db/queries'
import { broadcast } from '../../services/wsServer'
import { ABRINAY_PROFILE, MODEL_SONNET, extractJson } from '../abrinay'
import { getAgentConfig } from '../../db/agentConfigs'
import { buildConfigAdditions, getEffectiveProfile } from '../configHelpers'
import type { AgentName } from '@abrinay/shared-types'

interface YTVideoLargo {
  id: string
  parrilla_item_id: string
  titulo_seo: string
  descripcion: string
  escaleta: { timestamp: string; seccion: string; descripcion: string }[]
  gancho_apertura: string
  duracion_estimada_min: number
}

interface YTShort {
  id: string
  parrilla_item_id: string
  titulo: string
  guion: string
  hook_3seg: string
}

interface YTContenido {
  video_largo: YTVideoLargo | null
  shorts: YTShort[]
}

export interface QAResultYouTube {
  pieza_id: string
  agente_qa: 'atlas'
  status: 'aprobado' | 'descartado'
  score_general: number
  score_ctr: number
  problema?: string
  revision_attempt: number
  contenido_final?: YTVideoLargo | YTShort
}

export class AtlasAgent extends BaseAgent {
  readonly name: AgentName = 'atlas'
  readonly outputType = 'qa_results'

  private getCtrThreshold(baseScore: number): number {
    const history = getContentHistory('YouTube', 10)
    if (history.length < 3) return baseScore
    const avgCtr = history.reduce((s, r) => s + (r.score_ctr ?? 0), 0) / history.length
    // Umbral CTR: nunca menor a 3.0%, nunca mayor a 8.0%
    return Math.max(3.0, Math.min(8.0, avgCtr >= 7.0 ? baseScore + 1.0 : baseScore))
  }

  private async evaluatePiece(pieza: YTVideoLargo | YTShort, tipo: 'video_largo' | 'short', profile: string, additions: string, systemPrompt: string | null): Promise<{ score_general: number; score_ctr: number; status: 'aprobado' | 'needs_revision'; problema?: string; ejemplo_correcto?: string }> {
    const response = await callClaude({
      model: MODEL_SONNET,
      system: systemPrompt ?? `Eres Atlas, QA especialista en contenido YouTube para música urbana.
Evalúas videos con criterio de analista de rendimiento y director de contenido.
El score_ctr es el CTR estimado en % (ej: 6.5 = 6.5%).
Respondes ONLY con JSON válido.`,
      messages: [{
        role: 'user',
        content: `${profile}

PIEZA YOUTUBE (${tipo.toUpperCase()}) A EVALUAR:
${JSON.stringify(pieza, null, 2)}

Evalúa esta pieza de YouTube:
- score_general: calidad general 1-10 (narrativa, producción, retención)
- score_ctr: CTR estimado en % basado en título y thumbnail potencial (ej: 5.2 = 5.2%)

Responde SOLO con JSON:
{
  "score_general": number,
  "score_ctr": number,
  "status": "aprobado" | "needs_revision",
  "problema": "string (solo si needs_revision)",
  "ejemplo_correcto": "string (cómo corregirlo, solo si needs_revision)"
}${additions}`,
      }],
      maxTokens: 1024,
      mockKey: 'qa_youtube',
    })

    return extractJson(response) as { score_general: number; score_ctr: number; status: 'aprobado' | 'needs_revision'; problema?: string; ejemplo_correcto?: string }
  }

  protected async execute(ctx: RunContext): Promise<{ results: QAResultYouTube[] }> {
    this.thinking('Evaluando contenido YouTube...')

    const cfg = getAgentConfig(this.name)
    const profile = getEffectiveProfile(cfg, ABRINAY_PROFILE)
    const additions = buildConfigAdditions(cfg)

    const leoOut = getAgentOutput(ctx.runId, 'leo', 'contenido_youtube') as YTContenido | null
    if (!leoOut) return { results: [] }

    const ctrThreshold = this.getCtrThreshold(cfg.scoreThreshold)
    const maxRetries = cfg.maxRetries
    const results: QAResultYouTube[] = []
    const piezas: { item: YTVideoLargo | YTShort; tipo: 'video_largo' | 'short' }[] = [
      ...(leoOut.video_largo ? [{ item: leoOut.video_largo, tipo: 'video_largo' as const }] : []),
      ...((leoOut.shorts ?? []).map(s => ({ item: s, tipo: 'short' as const }))),
    ]

    for (const { item, tipo } of piezas) {
      this.thinking(`Evaluando YouTube ${tipo}: ${item.id}...`)

      let evaluation = await this.evaluatePiece(item, tipo, profile, additions, cfg.systemPrompt)
      let finalItem = item
      let revisionAttempt = 0
      let status: 'aprobado' | 'descartado' = evaluation.score_ctr >= ctrThreshold ? 'aprobado' : 'descartado'

      if (evaluation.score_ctr < ctrThreshold && revisionAttempt < maxRetries) {
        saveAgentOutput({
          runId: ctx.runId,
          agentName: 'atlas',
          outputType: 'qa_feedback',
          content: { pieza_id: item.id, revision_attempt: 0, problema: evaluation.problema, ejemplo_correcto: evaluation.ejemplo_correcto },
        })

        broadcast({ type: 'qa:revision', agentName: 'atlas', pieceId: item.id, score: evaluation.score_ctr })

        const revisionResponse = await callClaude({
          model: MODEL_SONNET,
          system: `Eres Leo, creador YouTube. Mejoras contenido según feedback de QA. Respondes SOLO con JSON del item revisado.`,
          messages: [{
            role: 'user',
            content: `Pieza: ${JSON.stringify(item, null, 2)}\nProblema: ${evaluation.problema}\nCómo mejorar: ${evaluation.ejemplo_correcto ?? ''}\nMejora especialmente el título SEO y el gancho inicial para aumentar CTR.`,
          }],
          maxTokens: 2048,
          mockKey: 'contenido_youtube',
        })

        const revisedRaw = extractJson(revisionResponse) as Partial<YTContenido>
        finalItem = tipo === 'video_largo'
          ? (revisedRaw.video_largo ?? item)
          : (revisedRaw.shorts?.[0] ?? item)
        revisionAttempt = 1

        saveAgentOutput({
          runId: ctx.runId,
          agentName: 'atlas',
          outputType: 'qa_feedback',
          content: { pieza_id: item.id, revision_attempt: 1, revision_note: evaluation.problema, contenido_revisado: JSON.stringify(finalItem) },
        })

        evaluation = await this.evaluatePiece(finalItem, tipo, profile, additions, cfg.systemPrompt)
        status = evaluation.score_ctr >= ctrThreshold ? 'aprobado' : 'descartado'
      }

      results.push({
        pieza_id: item.id,
        agente_qa: 'atlas',
        status,
        score_general: evaluation.score_general,
        score_ctr: evaluation.score_ctr,
        problema: status === 'descartado' ? evaluation.problema : undefined,
        revision_attempt: revisionAttempt,
        contenido_final: finalItem,
      })
    }

    return { results }
  }
}
