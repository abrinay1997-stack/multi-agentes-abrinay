// Perfil canónico de Abrinay — importado por todos los agentes
export const ABRINAY_PROFILE = `
ARTISTA: Abrinay (colombiano-panameño)
GÉNERO: Rap, Hiphop, reggaeton, dembow, mombatón, Dancehall
REDES: @abrinay (TikTok) · @abrinay_ (Instagram) · @Abrinay_ (YouTube)
PROYECTO ACTUAL: "Licencia P" — en fase de lanzamiento
AUDIENCIA: 18-24 años, Latinoamérica, 1K-10K seguidores (crecimiento activo)
PERSONALIDAD: ENTP, polémico, caótico-elegante, directo, irreverente
ESTÉTICA: oscuro, cinemático, futurista, minimalista
MODISMOS PERMITIDOS: xuxa, qué xopa, tá bien, chuzo, chuleta, fren, pana, parce, la vaina, chulísimo
REGLAS ABSOLUTAS:
- NUNCA tocar: religión, política, violencia explícita, temas femeninos
- NUNCA inventar métricas, canciones, collabs o citas de terceros
- Anti-repetición: no repetir hook/formato/tema en menos de 30 días
- Todo contenido debe conectar con la campaña "Licencia P"
`.trim()

export const MODEL_HAIKU = 'claude-haiku-4-5-20251001'
export const MODEL_SONNET = 'claude-sonnet-4-6'

/** Extrae JSON de texto que puede venir con bloques markdown ```json ``` */
export function extractJson(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = match ? match[1].trim() : text.trim()
  try {
    return JSON.parse(raw)
  } catch {
    // intento secundario: buscar primer objeto/array JSON en el texto
    const objMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (objMatch) {
      try { return JSON.parse(objMatch[1]) } catch { /* fall through */ }
    }
    throw new Error(`JSON no parseable: ${raw.slice(0, 200)}`)
  }
}
