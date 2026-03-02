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
  referencia_tendencia: string
}

interface Parrilla {
  items: ParrillaItem[]
}

export class ZaneAgent extends BaseAgent {
  readonly name: AgentName = 'zane'
  readonly outputType = 'guiones_tiktok'

  protected async execute(ctx: RunContext): Promise<unknown> {
    this.thinking('Escribiendo guiones TikTok...')

    const cfg = getAgentConfig(this.name)
    const profile = getEffectiveProfile(cfg, ABRINAY_PROFILE)
    const additions = buildConfigAdditions(cfg)

    const parrilla = getAgentOutput(ctx.runId, 'nova', 'parrilla_editorial') as Parrilla | null
    const tiktokItems = parrilla?.items?.filter(i => i.plataforma === 'TikTok') ?? []

    if (tiktokItems.length === 0) {
      return { guiones: [] }
    }

    const response = await callClaude({
      model: MODEL_SONNET,
      system: cfg.systemPrompt ?? `Eres Zane, guionista de TikTok para artistas urbanos.
Escribes guiones palabra por palabra, pensando en los primeros 3 segundos como el hook más importante.
Usas el lenguaje de Abrinay: directo, irreverente, auténtico, con modismos colombiano-panameños cuando aplica.
Respondes SOLO con JSON válido, sin texto adicional.`,
      messages: [{
        role: 'user',
        content: `${profile}

PIEZAS DE TIKTOK A GUIONIZAR:
${JSON.stringify(tiktokItems, null, 2)}

Para cada pieza, escribe un guión completo de TikTok (15-60 segundos).
El hook son los primeros 3 segundos exactos — deben DETENER el scroll.
Incluye indicaciones de cámara/acción entre corchetes.

Responde SOLO con JSON válido:
{
  "guiones": [
    {
      "id": "tiktok_001",
      "parrilla_item_id": "item_X",
      "hook": "string (primeros 3 segundos exactos)",
      "desarrollo": "string (guión completo con indicaciones)",
      "cta": "string | null",
      "audio_sugerido": "string",
      "duracion_estimada_seg": number,
      "modismos_usados": ["string"]
    }
  ]
}${additions}`,
      }],
      maxTokens: 4096,
      mockKey: 'guiones_tiktok',
    })

    return extractJson(response)
  }
}
