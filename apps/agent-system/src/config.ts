import 'dotenv/config'
import { z } from 'zod'

// trim() + falsy check: "ANTHROPIC_API_KEY=" (sin valor) → undefined → MOCK_MODE=true
// Evita que un .env con variables vacías active el modo real y falle en el SDK
const emptyToUndefined = z.string().optional().transform(v => v?.trim() || undefined)

const envSchema = z.object({
  ANTHROPIC_API_KEY:    emptyToUndefined,
  TAVILY_API_KEY:       emptyToUndefined,
  RESEND_API_KEY:       emptyToUndefined,
  RESEND_FROM_EMAIL:    emptyToUndefined,
  WS_PORT: z.coerce.number().default(8080),
  AGENT_SERVER_PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export const config = envSchema.parse(process.env)

export const MOCK_MODE = !config.ANTHROPIC_API_KEY

if (MOCK_MODE) {
  console.log('[config] MOCK_MODE=true — sin API keys, usando servicios simulados')
}
