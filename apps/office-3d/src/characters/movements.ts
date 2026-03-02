import type { CharacterName, QaAgentName } from '@abrinay/shared-types'

// Adónde camina cada agente al completar su tarea (entrega de info)
// Scout es invisible — no tiene movimiento 3D
export const DELIVERY_TARGETS: Partial<Record<CharacterName, CharacterName>> = {
  kira:    'nova',     // Trend Hunters reportan a Nova
  cleo:    'nova',
  orion:   'nova',
  nova:    'zane',     // Nova briefea a Content Creators (va al centro: Zane)
  zane:    'vera',     // Content → su agente QA correspondiente
  milo:    'stella',
  leo:     'atlas',
  vera:    'dimitri',  // QA aprobado → todo a Dimitri
  stella:  'dimitri',
  atlas:   'dimitri',
}

// Adónde va el agente QA cuando solicita una revisión al content creator
export const QA_REVISION_TARGETS: Record<QaAgentName, CharacterName> = {
  vera:   'zane',    // Vera rechaza → va al despacho de Zane
  stella: 'milo',
  atlas:  'leo',
}
