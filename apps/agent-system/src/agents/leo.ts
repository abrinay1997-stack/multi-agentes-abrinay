import { BaseAgent, type RunContext } from './base'
import { callClaude } from '../services/claude'
import { getAgentOutput } from '../db/queries'
import { ABRINAY_PROFILE, MODEL_SONNET, extractJson } from './abrinay'
import { getAgentConfig } from '../db/agentConfigs'
import { buildConfigAdditions, getEffectiveProfile } from './configHelpers'
import type { AgentName } from '@abrinay/shared-types'

interface ParrillaItem {
  id: string
  plataforma: string
  formato: string
  fecha_sugerida: string
  tema_central: string
  angulo: string
  hook_sugerido: string
}

interface Parrilla {
  items: ParrillaItem[]
}

export class LeoAgent extends BaseAgent {
  readonly name: AgentName = 'leo'
  readonly outputType = 'contenido_youtube'

  protected async execute(ctx: RunContext): Promise<unknown> {
    this.thinking('Desarrollando contenido YouTube...')

    const cfg = getAgentConfig(this.name)
    const profile = getEffectiveProfile(cfg, ABRINAY_PROFILE)
    const additions = buildConfigAdditions(cfg)

    const parrilla = getAgentOutput(ctx.runId, 'nova', 'parrilla_editorial') as Parrilla | null
    const ytItems = parrilla?.items?.filter(i => i.plataforma === 'YouTube') ?? []

    if (ytItems.length === 0) {
      return { video_largo: null, shorts: [] }
    }

    const response = await callClaude({
      model: MODEL_SONNET,
      system: cfg.systemPrompt ?? `Eres Leo, creador de contenido YouTube para artistas urbanos.
Desarrollas videos que combinan entretenimiento y autenticidad con alta producción narrativa.
Para videos largos: escaletas detalladas que mantienen la atención completa.
Para Shorts: hooks en 3 segundos que llevan al canal principal.
Respondes SOLO con JSON válido, sin texto adicional.`,
      messages: [{
        role: 'user',
        content: `${profile}

PIEZAS DE YOUTUBE A DESARROLLAR:
${JSON.stringify(ytItems, null, 2)}

Desarrolla cada pieza con escaleta completa para el video largo y guiones para los Shorts.
El título debe ser SEO-optimized para búsquedas en YouTube latinoamericano.

Responde SOLO con JSON válido:
{
  "video_largo": {
    "id": "yt_001",
    "parrilla_item_id": "item_X",
    "titulo_seo": "string (máx 60 chars, con keyword principal)",
    "descripcion": "string (primera línea hook, luego detalles + hashtags)",
    "escaleta": [
      { "timestamp": "00:00", "seccion": "string", "descripcion": "string" }
    ],
    "gancho_apertura": "string (primeras 15 segundos)",
    "duracion_estimada_min": number
  },
  "shorts": [
    {
      "id": "yt_short_001",
      "parrilla_item_id": "item_X",
      "titulo": "string",
      "guion": "string (escena por escena, máx 60seg)",
      "hook_3seg": "string"
    }
  ]
}${additions}`,
      }],
      maxTokens: 4096,
      mockKey: 'contenido_youtube',
    })

    return extractJson(response)
  }
}
