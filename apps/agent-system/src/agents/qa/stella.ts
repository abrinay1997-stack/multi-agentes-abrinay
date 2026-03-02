import { BaseAgent, type RunContext } from '../base'
import { callClaude } from '../../services/claude'
import { getAgentOutput, getContentHistory, saveAgentOutput } from '../../db/queries'
import { broadcast } from '../../services/wsServer'
import { ABRINAY_PROFILE, MODEL_SONNET, extractJson } from '../abrinay'
import { getAgentConfig } from '../../db/agentConfigs'
import { buildConfigAdditions, getEffectiveProfile } from '../configHelpers'
import type { AgentName } from '@abrinay/shared-types'

interface IGReel {
  id: string
  parrilla_item_id: string
  guion: string
  audio: string
  hook_visual: string
  estetica: string
  caption?: string
}

interface IGCarrusel {
  id: string
  parrilla_item_id: string
  slides: { numero: number; copy: string; visual_sugerido: string }[]
  caption: string
}

interface IGContenido {
  reels: IGReel[]
  carrusel: IGCarrusel | null
}

export interface QAResultInstagram {
  pieza_id: string
  agente_qa: 'stella'
  status: 'aprobado' | 'descartado'
  score_general: number
  problema?: string
  revision_attempt: number
  contenido_final?: IGReel | IGCarrusel
}

export class StellaAgent extends BaseAgent {
  readonly name: AgentName = 'stella'
  readonly outputType = 'qa_results'

  private getThreshold(baseScore: number): number {
    const history = getContentHistory('Instagram', 10)
    if (history.length < 3) return baseScore
    const avg = history.reduce((s, r) => s + (r.score_general ?? 0), 0) / history.length
    return Math.max(6.0, Math.min(9.5, avg >= 9.0 ? baseScore + 0.5 : baseScore))
  }

  private async evaluatePiece(pieza: IGReel | IGCarrusel, tipo: 'reel' | 'carrusel', profile: string, additions: string, systemPrompt: string | null): Promise<{ score_general: number; status: 'aprobado' | 'needs_revision'; problema?: string; ejemplo_correcto?: string }> {
    const response = await callClaude({
      model: MODEL_SONNET,
      system: systemPrompt ?? `Eres Stella, QA especialista en contenido Instagram para música urbana.
Evalúas Reels y carruseles con criterio de community manager y director creativo.
Respondes ONLY con JSON válido.`,
      messages: [{
        role: 'user',
        content: `${profile}

PIEZA INSTAGRAM (${tipo.toUpperCase()}) A EVALUAR:
${JSON.stringify(pieza, null, 2)}

Evalúa esta pieza de Instagram (escala 1-10):
- score_general: calidad general (estética, engagement, autenticidad, potencial viral en IG)

Responde SOLO con JSON:
{
  "score_general": number,
  "status": "aprobado" | "needs_revision",
  "problema": "string (solo si needs_revision)",
  "ejemplo_correcto": "string (cómo corregirlo, solo si needs_revision)"
}${additions}`,
      }],
      maxTokens: 1024,
      mockKey: 'qa_instagram',
    })

    return extractJson(response) as { score_general: number; status: 'aprobado' | 'needs_revision'; problema?: string; ejemplo_correcto?: string }
  }

  protected async execute(ctx: RunContext): Promise<{ results: QAResultInstagram[] }> {
    this.thinking('Evaluando contenido Instagram...')

    const cfg = getAgentConfig(this.name)
    const profile = getEffectiveProfile(cfg, ABRINAY_PROFILE)
    const additions = buildConfigAdditions(cfg)

    const miloOut = getAgentOutput(ctx.runId, 'milo', 'contenido_instagram') as IGContenido | null
    if (!miloOut) return { results: [] }

    const threshold = this.getThreshold(cfg.scoreThreshold)
    const maxRetries = cfg.maxRetries
    const results: QAResultInstagram[] = []
    const piezas: { item: IGReel | IGCarrusel; tipo: 'reel' | 'carrusel' }[] = [
      ...((miloOut.reels ?? []).map(r => ({ item: r as IGReel, tipo: 'reel' as const }))),
      ...(miloOut.carrusel ? [{ item: miloOut.carrusel as IGCarrusel, tipo: 'carrusel' as const }] : []),
    ]

    for (const { item, tipo } of piezas) {
      this.thinking(`Evaluando ${tipo} Instagram: ${item.id}...`)

      let evaluation = await this.evaluatePiece(item, tipo, profile, additions, cfg.systemPrompt)
      let finalItem = item
      let revisionAttempt = 0
      let status: 'aprobado' | 'descartado' = evaluation.score_general >= threshold ? 'aprobado' : 'descartado'

      if (evaluation.score_general < threshold && revisionAttempt < maxRetries) {
        saveAgentOutput({
          runId: ctx.runId,
          agentName: 'stella',
          outputType: 'qa_feedback',
          content: { pieza_id: item.id, revision_attempt: 0, problema: evaluation.problema, ejemplo_correcto: evaluation.ejemplo_correcto },
        })

        broadcast({ type: 'qa:revision', agentName: 'stella', pieceId: item.id, score: evaluation.score_general })

        const revisionResponse = await callClaude({
          model: MODEL_SONNET,
          system: `Eres Milo, creador Instagram. Revisas piezas según feedback de QA. Respondes SOLO con JSON del item revisado.`,
          messages: [{
            role: 'user',
            content: `Pieza original: ${JSON.stringify(item, null, 2)}\nFeedback QA: ${evaluation.problema}\nCómo mejorar: ${evaluation.ejemplo_correcto ?? ''}\nDevuelve el item corregido con el mismo schema.`,
          }],
          maxTokens: 2048,
          mockKey: 'contenido_instagram',
        })

        const revisedRaw = extractJson(revisionResponse)
        const revised = (revisedRaw as { reels?: IGReel[]; carrusel?: IGCarrusel })
        finalItem = tipo === 'reel'
          ? (revised.reels?.[0] ?? item)
          : (revised.carrusel ?? item)
        revisionAttempt = 1

        saveAgentOutput({
          runId: ctx.runId,
          agentName: 'stella',
          outputType: 'qa_feedback',
          content: { pieza_id: item.id, revision_attempt: 1, revision_note: evaluation.problema, contenido_revisado: JSON.stringify(finalItem) },
        })

        evaluation = await this.evaluatePiece(finalItem, tipo, profile, additions, cfg.systemPrompt)
        status = evaluation.score_general >= threshold ? 'aprobado' : 'descartado'
      }

      results.push({
        pieza_id: item.id,
        agente_qa: 'stella',
        status,
        score_general: evaluation.score_general,
        problema: status === 'descartado' ? evaluation.problema : undefined,
        revision_attempt: revisionAttempt,
        contenido_final: finalItem,
      })
    }

    return { results }
  }
}
