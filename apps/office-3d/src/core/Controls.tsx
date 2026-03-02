import { OrbitControls } from '@react-three/drei'

export function Controls() {
  return (
    <OrbitControls
      enablePan={false}
      enableZoom={true}
      minZoom={20}
      maxZoom={90}
      // Vista isométrica bloqueada
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 4}
      // Centro del nuevo layout
      target={[0, 0, 0.5]}
      enableDamping
      dampingFactor={0.05}
    />
  )
}
