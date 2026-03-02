import type { CharacterName } from '@abrinay/shared-types'

// Grid layout: 3 columnas (x: -6, 0, 6) × 4 filas (z: -7, -2, 3, 8)
//
//  BACK (z=-7)    Directores:   Nova[-3,-7]   Dimitri[3,-7]
//  ROW 2 (z=-2)  Trend Hunters: Kira[-6,-2]   Cleo[0,-2]   Orion[6,-2]
//  ROW 3 (z=3)   Content:       Zane[-6,3]    Milo[0,3]    Leo[6,3]
//  FRONT (z=8)   QA:            Vera[-6,8]    Stella[0,8]  Atlas[6,8]

export const AGENT_POSITIONS: Record<CharacterName, [number, number, number]> = {
  // Directores — fila trasera, prominentes
  nova:    [-3, 0, -7],
  dimitri: [ 3, 0, -7],

  // Trend Hunters — fila 2
  kira:    [-6, 0, -2],
  cleo:    [ 0, 0, -2],
  orion:   [ 6, 0, -2],

  // Content Creators — fila 3
  zane:    [-6, 0,  3],
  milo:    [ 0, 0,  3],
  leo:     [ 6, 0,  3],

  // QA — fila delantera
  vera:    [-6, 0,  8],
  stella:  [ 0, 0,  8],
  atlas:   [ 6, 0,  8],
}
