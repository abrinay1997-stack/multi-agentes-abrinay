import { useState } from 'react'
import { CharacterBase } from './CharacterBase'
import { AGENT_POSITIONS } from './positions'
import { AGENT_COLORS } from './colors'
import type { CharacterName } from '@abrinay/shared-types'

interface CharactersProps {
  onSelectAgent?: (name: CharacterName | null) => void
}

export function Characters({ onSelectAgent }: CharactersProps) {
  const [selected, setSelected] = useState<CharacterName | null>(null)

  function handleSelect(name: CharacterName) {
    const next = selected === name ? null : name
    setSelected(next)
    onSelectAgent?.(next)
  }

  return (
    <>
      {(Object.entries(AGENT_POSITIONS) as [CharacterName, [number, number, number]][]).map(
        ([name, pos]) => (
          <CharacterBase
            key={name}
            name={name}
            position={pos}
            color={AGENT_COLORS[name]}
            onSelect={handleSelect}
          />
        )
      )}
    </>
  )
}
