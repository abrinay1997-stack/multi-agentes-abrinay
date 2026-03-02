import { BaseAgent, type RunContext } from './base'
import { tavilySearch } from '../services/tavily'
import type { AgentName } from '@abrinay/shared-types'

interface ScoutOutput {
  tiktok_data: string | 'NO_DATA'
  instagram_data: string | 'NO_DATA'
  youtube_data: string | 'NO_DATA'
  scout_status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  scout_log: string[]
}

export class ScoutAgent extends BaseAgent {
  readonly name: AgentName = 'scout'
  readonly outputType = 'redes_data'

  protected async execute(_ctx: RunContext): Promise<ScoutOutput> {
    this.thinking('Rastreando redes sociales de Abrinay...')
    const log: string[] = []
    let tiktok_data: string | 'NO_DATA' = 'NO_DATA'
    let instagram_data: string | 'NO_DATA' = 'NO_DATA'
    let youtube_data: string | 'NO_DATA' = 'NO_DATA'

    try {
      const r = await tavilySearch('Abrinay @abrinay TikTok música rap dembow', 4)
      if (r.results.length > 0) {
        tiktok_data = r.results.map(x => `[${x.title}] ${x.content}`).join(' | ')
        log.push(`TikTok: ${r.results.length} resultados`)
      } else {
        log.push('TikTok: sin resultados')
      }
    } catch (e) {
      log.push(`TikTok: error — ${(e as Error).message}`)
    }

    try {
      const r = await tavilySearch('Abrinay @abrinay_ Instagram artista músico reggaeton', 4)
      if (r.results.length > 0) {
        instagram_data = r.results.map(x => `[${x.title}] ${x.content}`).join(' | ')
        log.push(`Instagram: ${r.results.length} resultados`)
      } else {
        log.push('Instagram: sin resultados')
      }
    } catch (e) {
      log.push(`Instagram: error — ${(e as Error).message}`)
    }

    try {
      const r = await tavilySearch('Abrinay @Abrinay_ YouTube canal música hiphop', 4)
      if (r.results.length > 0) {
        youtube_data = r.results.map(x => `[${x.title}] ${x.content}`).join(' | ')
        log.push(`YouTube: ${r.results.length} resultados`)
      } else {
        log.push('YouTube: sin resultados')
      }
    } catch (e) {
      log.push(`YouTube: error — ${(e as Error).message}`)
    }

    const successCount = [tiktok_data, instagram_data, youtube_data]
      .filter(d => d !== 'NO_DATA').length

    return {
      tiktok_data,
      instagram_data,
      youtube_data,
      scout_status: successCount === 3 ? 'SUCCESS' : successCount > 0 ? 'PARTIAL' : 'FAILED',
      scout_log: log,
    }
  }
}
