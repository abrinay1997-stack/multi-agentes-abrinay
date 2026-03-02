import { BaseAgent, type RunContext } from './base'
import { callClaude } from '../services/claude'
import { getAgentOutput, getContentHistory } from '../db/queries'
import { ABRINAY_PROFILE, MODEL_SONNET, extractJson } from './abrinay'
import { getAgentConfig } from '../db/agentConfigs'
import { buildConfigAdditions, getEffectiveProfile } from './configHelpers'
import type { AgentName } from '@abrinay/shared-types'

export class NovaAgent extends BaseAgent {
  readonly name: AgentName = 'nova'
  readonly outputType = 'parrilla_editorial'

  protected async execute(ctx: RunContext): Promise<unknown> {
    this.thinking('Diseñando estrategia editorial omnicanal...')

    const cfg = getAgentConfig(this.name)
    const profile = getEffectiveProfile(cfg, ABRINAY_PROFILE)
    const additions = buildConfigAdditions(cfg)

    const kiraOut = getAgentOutput(ctx.runId, 'kira', 'tendencias')
    const cleoOut = getAgentOutput(ctx.runId, 'cleo', 'tendencias')
    const orionOut = getAgentOutput(ctx.runId, 'orion', 'tendencias')

    const histTikTok = getContentHistory('TikTok', 15)
    const histIG = getContentHistory('Instagram', 15)
    const histYT = getContentHistory('YouTube', 15)

    // Anti-repetición: extraer hooks y formatos reales del historial (C8 fix)
    // Antes se usaba h.score_general (un número) — el LLM no puede deduplicar
    // basándose en scores. Ahora se usan los textos de hook y formatos reales.
    const usedHooks = [...histTikTok, ...histIG, ...histYT]
      .slice(0, 15)
      .filter(h => h.hook)
      .map(h => h.hook as string)

    const usedFormatos = [...histTikTok, ...histIG, ...histYT]
      .filter(h => h.formato)
      .map(h => h.formato as string)

    const fechaBase = new Date()
    fechaBase.setDate(fechaBase.getDate() + 1)

    const response = await callClaude({
      model: MODEL_SONNET,
      system: cfg.systemPrompt ?? `Eres Nova, estratega editorial de contenido digital para artistas urbanos.
Tu especialidad es diseñar parrillas de contenido multiplataforma coherentes y de alto impacto.
Respondes SOLO con JSON válido, sin texto adicional.`,
      messages: [{
        role: 'user',
        content: `${profile}

TENDENCIAS ACTUALES:

TIKTOK (análisis de Kira):
${JSON.stringify(kiraOut, null, 2)}

INSTAGRAM (análisis de Cleo):
${JSON.stringify(cleoOut, null, 2)}

YOUTUBE (análisis de Orion):
${JSON.stringify(orionOut, null, 2)}

HISTORIAL RECIENTE (evitar repetir en los próximos 30 días):
${usedHooks.length > 0
  ? `Hooks ya usados (NO repetir ganchos similares):\n${usedHooks.map(h => `- "${h}"`).join('\n')}\n\nFormatos recientes: ${[...new Set(usedFormatos)].join(', ')}`
  : 'Primer run — sin restricciones de repetición'
}

Genera una parrilla editorial para las próximas 2 semanas (desde ${fechaBase.toISOString().split('T')[0]}).
Incluye: 3 piezas TikTok + 2 Instagram (1 reel + 1 carrusel) + 2 YouTube (1 video largo + 1 short).
Todas las piezas deben apoyar el lanzamiento de "Licencia P".

Responde SOLO con JSON válido:
{
  "items": [
    {
      "id": "item_1",
      "plataforma": "TikTok" | "Instagram" | "YouTube",
      "formato": "video_corto" | "reel" | "carrusel" | "video_largo" | "short",
      "fecha_sugerida": "YYYY-MM-DD",
      "hora_sugerida": "HH:MM-HH:MM",
      "tema_central": "string",
      "angulo": "string",
      "hook_sugerido": "string",
      "referencia_tendencia": "string"
    }
  ],
  "estrategia_licencia_p": "string",
  "justificacion": "string"
}${additions}`,
      }],
      maxTokens: 4096,
      mockKey: 'parrilla_editorial',
    })

    return extractJson(response)
  }
}
