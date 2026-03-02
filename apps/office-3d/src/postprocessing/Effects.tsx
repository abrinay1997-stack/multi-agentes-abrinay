import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// Bloom + ACES filmic tone mapping
// DOF eliminado: incompatible con OrthographicCamera
export function Effects() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.75}
        luminanceSmoothing={0.9}
        intensity={1.2}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
