import { OrthographicCamera } from '@react-three/drei'

// Zoom reducido y posición más alejada para ver el layout completo (22×17 unidades)
export function Camera() {
  return (
    <OrthographicCamera
      makeDefault
      position={[20, 20, 20]}
      zoom={38}
      near={0.1}
      far={1000}
    />
  )
}
