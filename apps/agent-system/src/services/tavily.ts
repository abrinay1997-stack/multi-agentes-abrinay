import { MOCK_MODE, config } from '../config'

export interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

export interface TavilySearchResponse {
  query: string
  results: TavilyResult[]
}

const MOCK_RESULTS: TavilyResult[] = [
  { title: 'Tendencias dembow urbano 2026', url: 'https://example.com/1', content: 'El dembow oscuro y cinematográfico domina en plataformas latinas. Artistas como Abrinay lideran esta estética.', score: 0.92 },
  { title: 'Artistas emergentes Colombia/Panamá 2026', url: 'https://example.com/2', content: 'Nueva generación fusiona rap colombiano con reggaeton panameño. Audiencia 18-24 muy receptiva.', score: 0.88 },
  { title: 'TikTok Music Trends LATAM Q1 2026', url: 'https://example.com/3', content: 'Audios virales con estética oscura y minimalista son tendencia. Videos cortos de 30s con drop visible.', score: 0.85 },
  { title: 'Instagram Reels estrategia música indie', url: 'https://example.com/4', content: 'Carruseles de proceso creativo generan 3x más saves que posts estáticos.', score: 0.80 },
  { title: 'YouTube Shorts para artistas en crecimiento', url: 'https://example.com/5', content: 'Mini-docs de 45-60s sobre el proceso de producción aumentan suscriptores 40% más rápido.', score: 0.78 },
]

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function tavilySearch(query: string, maxResults = 5): Promise<TavilySearchResponse> {
  if (MOCK_MODE || !config.TAVILY_API_KEY) {
    await delay(800 + Math.random() * 1200)
    return {
      query,
      results: MOCK_RESULTS.slice(0, maxResults).map(r => ({
        ...r,
        content: `[Mock] ${r.content}`,
      })),
    }
  }

  // Real Tavily — retry with exponential backoff
  const { tavily } = await import('@tavily/core')
  const client = tavily({ apiKey: config.TAVILY_API_KEY })

  let lastError: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await client.search(query, { maxResults })
      return {
        query,
        results: (result.results ?? []).map((r: TavilyResult) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
        })),
      }
    } catch (err) {
      lastError = err as Error
      if (attempt < 2) await delay(1000 * (attempt + 1))
    }
  }
  throw lastError ?? new Error('Tavily search failed after 3 attempts')
}
