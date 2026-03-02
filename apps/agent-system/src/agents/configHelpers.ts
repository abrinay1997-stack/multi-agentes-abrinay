import type { AgentConfig } from '../db/agentConfigs'

/**
 * Construye el bloque de texto con reglas y notas de memoria
 * que se inyecta al final del prompt de cada agente.
 */
export function buildConfigAdditions(cfg: AgentConfig): string {
  const parts: string[] = []

  if (cfg.rulesAlways?.length) {
    parts.push('REGLAS ADICIONALES — SIEMPRE HACER:')
    cfg.rulesAlways.forEach(r => parts.push(`• ${r}`))
  }

  if (cfg.rulesNever?.length) {
    parts.push('REGLAS ADICIONALES — NUNCA HACER:')
    cfg.rulesNever.forEach(r => parts.push(`• ${r}`))
  }

  if (cfg.memoryNotes) {
    parts.push(`NOTAS / MEMORIA ADICIONAL:\n${cfg.memoryNotes}`)
  }

  return parts.length > 0 ? '\n\n' + parts.join('\n') : ''
}

/**
 * Devuelve el perfil de Abrinay efectivo:
 * usa el override de config si existe, o el default hardcoded.
 */
export function getEffectiveProfile(cfg: AgentConfig, defaultProfile: string): string {
  return cfg.abrinayProfile ?? defaultProfile
}
