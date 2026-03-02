// Luces — más ambiente para que la oficina sea VISIBLE (no universo oscuro)
export function Lights() {
  return (
    <>
      {/* Hemisferio: cielo claro-azul vs suelo oscuro — ilumina todo */}
      <hemisphereLight
        color="#c0c8ff"
        groundColor="#1a1a2e"
        intensity={1.4}
      />

      {/* Luz principal — sombras suaves desde arriba-derecha */}
      <directionalLight
        position={[12, 22, 14]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={120}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0008}
        color="#dde8ff"
      />

      {/* Relleno trasero izquierdo — rosa, separa del fondo */}
      <directionalLight
        position={[-12, 8, -10]}
        intensity={0.5}
        color="#ff4d8d"
      />

      {/* RectArea techo: ilumina uniformemente el plano de trabajo */}
      <rectAreaLight
        position={[0, 5, 0.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={18}
        height={22}
        intensity={2.5}
        color="#e8eeff"
      />

      {/* Zona Directores — luz ambar calida */}
      <pointLight position={[0, 4, -7]} intensity={12} distance={8} color="#FF8C00" />

      {/* Zona Trend Hunters — azul */}
      <pointLight position={[0, 4, -2]} intensity={8} distance={9} color="#4466ff" />

      {/* Zona Content Creators — verde cyan */}
      <pointLight position={[0, 4, 3]} intensity={8} distance={9} color="#00cc66" />

      {/* Zona QA — rojo */}
      <pointLight position={[0, 4, 8]} intensity={10} distance={9} color="#FF2D55" />
    </>
  )
}
