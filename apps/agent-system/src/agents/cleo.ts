import { BaseAgent, type RunContext } from './base'
import { callClaude } from '../services/claude'
import { tavilySearch } from '../services/tavily'
import { getAgentOutput } from '../db/queries'
import { ABRINAY_PROFILE, MODEL_HAIKU, extractJson } from './abrinay'
import { getAgentConfig } from '../db/agentConfigs'
import { buildConfigAdditions, getEffectiveProfile } from './configHelpers'
import type { AgentName } from '@abrinay/shared-types'

const DEFAULT_QUERIES_CLEO = [
  'tendencias Instagram Reels música urbana reggaeton 2026',
  'Instagram content strategy artista emergente rap dembow latino',
]

export class CleoAgent extends BaseAgent {
  readonly name: AgentName = 'cleo'
  readonly outputType = 'tendencias'

  protected async execute(ctx: RunContext): Promise<unknown> {
    this.thinking('Analizando tendencias Instagram...')

    const cfg = getAgentConfig(this.name)
    const profile = getEffectiveProfile(cfg, ABRINAY_PROFILE)
    const additions = buildConfigAdditions(cfg)
    const queries = cfg.tavilyQueries ?? DEFAULT_QUERIES_CLEO

    const scoutData = getAgentOutput(ctx.runId, 'scout', 'redes_data') as Record<string, string> | null

    const [r1, r2] = await Promise.all([
      tavilySearch(queries[0], 4),
      tavilySearch(queries[1] ?? queries[0], 3),
    ])

    const trendsRaw = [...r1.results, ...r2.results]
      .map(r => `- ${r.title}: ${r.content}`)
      .join('\n')

    const response = await callClaude({
      model: MODEL_HAIKU,
      messages: [{
        role: 'user',
        content: `${profile}

DATOS DE ABRINAY EN INSTAGRAM:
${scoutData?.instagram_data ?? 'No disponible'}

TENDENCIAS ENCONTRADAS (búsqueda web):
${trendsRaw}

Selecciona las 3 tendencias de Instagram más relevantes para la campaña Licencia P de Abrinay.
Responde SOLO con JSON válido:
{
  "plataforma": "Instagram",
  "tendencias": [
    {
      "nombre": "string",
      "descripcion": "string",
      "relevancia_para_abrinay": "string",
      "es_dato_real": boolean,
      "fuente_url": "string opcional"
    }
  ],
  "fecha_busqueda": "${new Date().toISOString()}"
}${additions}`,
      }],
      maxTokens: 2048,
      mockKey: 'tendencias_instagram',
    })

    return extractJson(response)
  }
}
