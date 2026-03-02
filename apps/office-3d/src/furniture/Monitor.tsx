import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */`
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Fondo oscuro base
    vec3 col = vec3(0.015, 0.02, 0.05);

    // Scanlines sutiles
    float scanline = sin(uv.y * 140.0 + uTime * 1.5) * 0.012;
    col += scanline;

    // Glow central del color del agente
    vec2 center = uv - 0.5;
    float dist = length(center);
    float glow = 1.0 - smoothstep(0.0, 0.6, dist);
    col += uColor * glow * 0.35;

    // Pulso idle
    float pulse = 0.95 + sin(uTime * 0.7) * 0.05;
    col *= pulse;

    // Vignette bordes
    float vignette = 1.0 - smoothstep(0.25, 0.5, dist);
    col *= vignette;

    // Línea de cursor parpadeante
    float cursorY = mod(uTime * 0.15, 1.0);
    float cursor = smoothstep(0.005, 0.0, abs(uv.y - cursorY)) * 0.3;
    col += uColor * cursor;

    gl_FragColor = vec4(col, 1.0);
  }
`

interface MonitorProps {
  color?: string
}

export function Monitor({ color = '#0044ff' }: MonitorProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const [r, g, b] = new THREE.Color(color).toArray()

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <group>
      {/* Marco del monitor */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.88, 0.60, 0.06]} />
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Pantalla con ShaderMaterial */}
      <mesh position={[0, 0, 0.032]}>
        <planeGeometry args={[0.76, 0.48]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uColor: { value: new THREE.Vector3(r, g, b) },
          }}
        />
      </mesh>

      {/* Soporte (pie) */}
      <mesh position={[0, -0.38, 0.06]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.18, 8]} />
        <meshStandardMaterial color="#222" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Base del soporte */}
      <mesh position={[0, -0.475, 0.06]} castShadow>
        <boxGeometry args={[0.28, 0.025, 0.18]} />
        <meshStandardMaterial color="#222" roughness={0.4} metalness={0.8} />
      </mesh>
    </group>
  )
}
