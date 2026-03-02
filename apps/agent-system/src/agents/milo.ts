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

export class MiloAgent extends BaseAgent {
  readonly name: AgentName = 'milo'
  readonly outputType = 'contenido_instagram'

  protected async execute(ctx: RunContext): Promise<unknown> {
    this.thinking('Creando contenido Instagram...')

    const cfg = getAgentConfig(this.name)
    const profile = getEffectiveProfile(cfg, ABRINAY_PROFILE)
    const additions = buildConfigAdditions(cfg)

    const parrilla = getAgentOutput(ctx.runId, 'nova', 'parrilla_editorial') as Parrilla | null
    const igItems = parrilla?.items?.filter(i => i.plataforma === 'Instagram') ?? []

    if (igItems.length === 0) {
      return { reels: [], carrusel: null }
    }

    const response = await callClaude({
      model: MODEL_SONNET,
      system: cfg.systemPrompt ?? `Eres Milo, creador de contenido Instagram para artistas urbanos.
Diseñas Reels y carruseles que detienen el scroll con estética oscura, cinemática y minimalista.
Cada pieza debe tener una identidad visual clara y un copy que enganche.
Respondes SOLO con JSON válido, sin texto adicional.`,
      messages: [{
        role: 'user',
        content: `${profile}

PIEZAS DE INSTAGRAM A DESARROLLAR:
${JSON.stringify(igItems, null, 2)}

Desarrolla cada pieza con todos los detalles de producción.
Para carruseles: mínimo 5 slides con copy específico.

Responde SOLO con JSON válido:
{
  "reels": [
    {
      "id": "ig_reel_001",
      "parrilla_item_id": "item_X",
      "guion": "string (descripción escena por escena)",
      "audio": "string",
      "hook_visual": "string (primer frame)",
      "estetica": "string (descripción visual)",
      "caption": "string (texto del post con hashtags)"
    }
  ],
  "carrusel": {
    "id": "ig_carrusel_001",
    "parrilla_item_id": "item_X",
    "slides": [
      { "numero": 1, "copy": "string", "visual_sugerido": "string" }
    ],
    "caption": "string (texto del post con hashtags)"
  }
}${additions}`,
      }],
      maxTokens: 4096,
      mockKey: 'contenido_instagram',
    })

    return extractJson(response)
  }
}
