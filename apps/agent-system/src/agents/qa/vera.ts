import { BaseAgent, type RunContext } from '../base'
import { callClaude } from '../../services/claude'
import { getAgentOutput, getContentHistory, saveAgentOutput } from '../../db/queries'
import { broadcast } from '../../services/wsServer'
import { ABRINAY_PROFILE, MODEL_SONNET, extractJson } from '../abrinay'
import { getAgentConfig } from '../../db/agentConfigs'
import { buildConfigAdditions, getEffectiveProfile } from '../configHelpers'
import type { AgentName } from '@abrinay/shared-types'

interface TikTokGuion {
  id: string
  parrilla_item_id: string
  hook: string
  desarrollo: string
  cta: string | null
  audio_sugerido: string
  duracion_estimada_seg: number
  modismos_usados: string[]
}

export interface QAResultTikTok {
  pieza_id: string
  agente_qa: 'vera'
  status: 'aprobado' | 'descartado'
  score_general: number
  score_hook: number
  problema?: string
  ejemplo_correcto?: string
  revision_attempt: number
  contenido_final?: TikTokGuion
}

export class VeraAgent extends BaseAgent {
  readonly name: AgentName = 'vera'
  readonly outputType = 'qa_results'

  // Calibrar umbral basado en historial
  private getThresholds(baseScore: number): { general: number; hook: number } {
    const history = getContentHistory('TikTok', 10)
    if (history.length < 3) return { general: baseScore, hook: baseScore }

    const avgGeneral = history.reduce((s, r) => s + (r.score_general ?? 0), 0) / history.length
    const threshold = avgGeneral >= 9.0 ? baseScore + 0.5 : baseScore
    return {
      general: Math.max(6.0, Math.min(9.5, threshold)),
      hook: Math.max(6.0, Math.min(9.5, threshold)),
    }
  }

  private async evaluatePiece(guion: TikTokGuion, profile: string, additions: string, systemPrompt: string | null): Promise<{ score_general: number; score_hook: number; status: 'aprobado' | 'needs_revision'; problema?: string; ejemplo_correcto?: string }> {
    const response = await callClaude({
      model: MODEL_SONNET,
      system: systemPrompt ?? `Eres Vera, QA especialista en contenido TikTok para música urbana latina.
Evalúas guiones con criterio de director creativo: engagement, autenticidad, impacto del hook.
Respondes ONLY con JSON válido.`,
      messages: [{
        role: 'user',
        content: `${profile}

GUIÓN TIKTOK A EVALUAR:
${JSON.stringify(guion, null, 2)}

Evalúa este guión en dos dimensiones (1-10):
1. score_general: calidad general (narrativa, autenticidad, potencial viral)
2. score_hook: impacto del hook de los primeros 3 segundos

Responde SOLO con JSON:
{
  "score_general": number,
  "score_hook": number,
  "status": "aprobado" | "needs_revision",
  "problema": "string (solo si needs_revision)",
  "ejemplo_correcto": "string (cómo corregirlo, solo si needs_revision)"
}${additions}`,
      }],
      maxTokens: 1024,
      mockKey: 'qa_tiktok',
    })

    return extractJson(response) as { score_general: number; score_hook: number; status: 'aprobado' | 'needs_revision'; problema?: string; ejemplo_correcto?: string }
  }

  private async requestRevision(guion: TikTokGuion, problema: string, ejemplo: string | undefined, profile: string): Promise<TikTokGuion> {
    const response = await callClaude({
      model: MODEL_SONNET,
      system: `Eres Zane, guionista TikTok. Revisas guiones según feedback de QA.
Solo corriges lo señalado, manteniendo la esencia original.
Respondes SOLO con el JSON del guión revisado.`,
      messages: [{
        role: 'user',
        content: `${profile}

GUIÓN ORIGINAL:
${JSON.stringify(guion, null, 2)}

FEEDBACK DE QA:
Problema: ${problema}
Cómo corregirlo: ${ejemplo ?? 'Mejorar según los criterios del perfil del artista'}

Devuelve el guión corregido con el mismo schema, solo cambiando lo necesario.
Responde SOLO con JSON válido del guión revisado.`,
      }],
      maxTokens: 2048,
      mockKey: 'guiones_tiktok',
    })

    return extractJson(response) as TikTokGuion
  }

  protected async execute(ctx: RunContext): Promise<{ results: QAResultTikTok[] }> {
    this.thinking('Evaluando guiones TikTok...')

    const cfg = getAgentConfig(this.name)
    const profile = getEffectiveProfile(cfg, ABRINAY_PROFILE)
    const additions = buildConfigAdditions(cfg)

    const zaneOut = getAgentOutput(ctx.runId, 'zane', 'guiones_tiktok') as { guiones: TikTokGuion[] } | null
    const guiones = zaneOut?.guiones ?? []

    if (guiones.length === 0) return { results: [] }

    const thresholds = this.getThresholds(cfg.scoreThreshold)
    const maxRetries = cfg.maxRetries
    const results: QAResultTikTok[] = []

    for (const guion of guiones) {
      this.thinking(`Evaluando TikTok: ${guion.id}...`)

      let eval1 = await this.evaluatePiece(guion, profile, additions, cfg.systemPrompt)
      let finalGuion = guion
      let revisionAttempt = 0

      const approved = eval1.score_general >= thresholds.general && eval1.score_hook >= thresholds.hook
      let status: 'aprobado' | 'needs_revision' | 'descartado' = approved ? 'aprobado' : 'needs_revision'

      if (status === 'needs_revision' && revisionAttempt < maxRetries) {
        // Guardar feedback de QA
        saveAgentOutput({
          runId: ctx.runId,
          agentName: 'vera',
          outputType: 'qa_feedback',
          content: { pieza_id: guion.id, revision_attempt: 0, problema: eval1.problema, ejemplo_correcto: eval1.ejemplo_correcto },
        })

        broadcast({ type: 'qa:revision', agentName: 'vera', pieceId: guion.id, score: eval1.score_general })

        // Pedir revisión al guionista
        const revisedGuion = await this.requestRevision(guion, eval1.problema ?? '', eval1.ejemplo_correcto, profile)
        revisionAttempt = 1

        // Guardar contenido revisado
        saveAgentOutput({
          runId: ctx.runId,
          agentName: 'vera',
          outputType: 'qa_feedback',
          content: { pieza_id: guion.id, revision_attempt: 1, revision_note: `Revisión: ${eval1.problema}`, contenido_revisado: JSON.stringify(revisedGuion) },
        })

        // Re-evaluar — máximo 1 revisión
        const eval2 = await this.evaluatePiece(revisedGuion, profile, additions, cfg.systemPrompt)
        const approved2 = eval2.score_general >= thresholds.general && eval2.score_hook >= thresholds.hook
        status = approved2 ? 'aprobado' : 'descartado'
        eval1 = eval2
        finalGuion = revisedGuion
      } else if (status === 'needs_revision') {
        status = 'descartado'
      }

      results.push({
        pieza_id: guion.id,
        agente_qa: 'vera',
        status: status as 'aprobado' | 'descartado',
        score_general: eval1.score_general,
        score_hook: eval1.score_hook,
        problema: status === 'descartado' ? eval1.problema : undefined,
        revision_attempt: revisionAttempt,
        contenido_final: finalGuion,
      })
    }

    return { results }
  }
}
