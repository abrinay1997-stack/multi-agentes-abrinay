import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'
import { useAgentStore } from '../store/agentStore'
import type { CharacterName } from '@abrinay/shared-types'

interface Refs {
  groupRef: React.RefObject<THREE.Group>
  armLRef:  React.RefObject<THREE.Mesh>
  armRRef:  React.RefObject<THREE.Mesh>
  headRef:  React.RefObject<THREE.Mesh>
  legLRef:  React.RefObject<THREE.Mesh>
  legRRef:  React.RefObject<THREE.Mesh>
}

// homePosition es la posición absoluta del agente (para calcular offsets de caminata)
// groupRef apunta al GRUPO INTERNO → GSAP anima offsets desde [0,0,0]
export function useAgentAnimation(
  agentName: CharacterName,
  homePosition: [number, number, number],
  refs: Refs,
) {
  const { groupRef, armLRef, armRRef, headRef, legLRef, legRRef } = refs
  const isWalkingRef = useRef(false)
  // returnTimerRef: guarda el ID del setTimeout "volver a casa" para limpiarlo en cleanup (NG3)
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // pendingWalkTargetRef: queue de 1 elemento para walkTargets recibidos durante caminata (NG4)
  const pendingWalkTargetRef = useRef<[number, number, number] | null>(null)

  // ── Animación de estado (typing / complete / error / idle) ────────────────
  useEffect(() => {
    const unsub = useAgentStore.subscribe(
      (state) => state.agents[agentName]?.status,
      (newStatus) => {
        const arm  = armLRef.current
        const armR = armRRef.current
        const head = headRef.current
        const group = groupRef.current
        if (!arm || !group) return

        switch (newStatus) {
          case 'typing':
            // Solo animar brazos si no está caminando
            if (isWalkingRef.current) return
            gsap.killTweensOf(arm.rotation)
            gsap.to(arm.rotation, { x: 0.5, repeat: -1, yoyo: true, duration: 0.25, ease: 'power1.inOut' })
            if (armR) {
              gsap.killTweensOf(armR.rotation)
              gsap.to(armR.rotation, { x: -0.5, repeat: -1, yoyo: true, duration: 0.3, ease: 'power1.inOut' })
            }
            if (head) gsap.to(head.rotation, { x: 0.15, duration: 0.4 })
            break

          case 'complete':
            if (isWalkingRef.current) return
            gsap.killTweensOf([arm.rotation, armR?.rotation].filter(Boolean))
            gsap.to(arm.rotation,  { x: 0, duration: 0.3 })
            if (armR) gsap.to(armR.rotation, { x: 0, duration: 0.3 })
            if (head) gsap.to(head.rotation, { x: 0, duration: 0.3 })
            // Bounce de celebración
            gsap.to(group.scale, { y: 1.18, duration: 0.14, yoyo: true, repeat: 3, ease: 'power2.out' })
            break

          case 'error':
            if (isWalkingRef.current) return
            gsap.killTweensOf([arm.rotation, armR?.rotation].filter(Boolean))
            gsap.to(arm.rotation, { x: 0, duration: 0.2 })
            if (armR) gsap.to(armR.rotation, { x: 0, duration: 0.2 })
            if (head) gsap.to(head.rotation, { x: 0, duration: 0.2 })
            gsap.to(group.rotation, {
              y: 0.2, repeat: 5, yoyo: true, duration: 0.1, ease: 'power1.inOut',
              onComplete: () => { group.rotation.y = 0 },
            })
            break

          case 'idle':
          default:
            if (isWalkingRef.current) return
            gsap.killTweensOf([arm.rotation, armR?.rotation].filter(Boolean))
            gsap.to(arm.rotation,  { x: 0, duration: 0.5 })
            if (armR) gsap.to(armR.rotation, { x: 0, duration: 0.5 })
            if (head) gsap.to(head.rotation, { x: 0, duration: 0.5 })
            break
        }
      },
    )
    return unsub
  }, [agentName]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animación de caminata (walkTarget) ───────────────────────────────────
  useEffect(() => {
    const unsub = useAgentStore.subscribe(
      (state) => state.agents[agentName]?.walkTarget,
      (walkTarget) => {
        if (!walkTarget) return
        if (isWalkingRef.current) {
          // Encolar el destino para ejecutarlo al regresar a casa (NG4)
          pendingWalkTargetRef.current = walkTarget
          return
        }

        const group = groupRef.current
        const legL  = legLRef.current
        const legR  = legRRef.current
        const arm   = armLRef.current
        const armR  = armRRef.current
        const head  = headRef.current
        if (!group) return

        isWalkingRef.current = true

        // Parar animaciones de escritura
        if (arm)  { gsap.killTweensOf(arm.rotation);  gsap.to(arm.rotation,  { x: 0, duration: 0.15 }) }
        if (armR) { gsap.killTweensOf(armR.rotation); gsap.to(armR.rotation, { x: 0, duration: 0.15 }) }
        if (head) gsap.to(head.rotation, { x: 0, duration: 0.15 })

        // ── Calcular offset relativo al grupo externo ────────────────
        const dx = walkTarget[0] - homePosition[0]
        const dz = walkTarget[2] - homePosition[2]
        const dist = Math.sqrt(dx * dx + dz * dz)
        const walkDuration = Math.max(1.2, dist * 0.28)  // más rápido cerca, más lento lejos

        // Rotar para mirar hacia el destino
        const angleToTarget = Math.atan2(dx, dz)
        gsap.to(group.rotation, { y: angleToTarget, duration: 0.3 })

        // ── Animación de piernas ─────────────────────────────────────
        function startLegs() {
          if (!legL || !legR) return
          gsap.killTweensOf(legL.rotation)
          gsap.killTweensOf(legR.rotation)
          gsap.to(legL.rotation, { x: 0.55, repeat: -1, yoyo: true, duration: 0.22, ease: 'power1.inOut' })
          gsap.to(legR.rotation, { x: -0.55, repeat: -1, yoyo: true, duration: 0.22, ease: 'power1.inOut', delay: 0.11 })
        }

        function stopLegs(onDone?: () => void) {
          if (!legL || !legR) { onDone?.(); return }
          gsap.killTweensOf(legL.rotation)
          gsap.killTweensOf(legR.rotation)
          gsap.to(legL.rotation, { x: 0, duration: 0.18, onComplete: onDone })
          gsap.to(legR.rotation, { x: 0, duration: 0.18 })
        }

        startLegs()

        // ── Tween hacia el destino ───────────────────────────────────
        gsap.to(group.position, {
          x: dx,
          z: dz,
          duration: walkDuration,
          ease: 'none',
          onComplete: () => {
            stopLegs()

            // Orientarse hacia el escritorio del destinatario (encarar hacia cámara = y=0)
            gsap.to(group.rotation, { y: Math.PI, duration: 0.3 })

            // Gesto de entrega: brazo izquierdo hacia arriba
            if (arm) {
              gsap.to(arm.rotation, { x: -1.1, duration: 0.3, yoyo: true, repeat: 1, ease: 'power2.inOut' })
            }

            // ── Volver a casa después de 1.4s ──────────────────────
            // Guardar ID del timer para limpiarlo si el componente se desmonta (NG3)
            returnTimerRef.current = setTimeout(() => {
              returnTimerRef.current = null
              if (!group) return

              // Mirar de vuelta hacia casa
              const angleHome = Math.atan2(-dx, -dz)
              gsap.to(group.rotation, { y: angleHome, duration: 0.3 })

              startLegs()

              gsap.to(group.position, {
                x: 0,
                z: 0,
                duration: walkDuration,
                ease: 'none',
                onComplete: () => {
                  stopLegs()
                  gsap.to(group.rotation, { y: 0, duration: 0.3 })
                  isWalkingRef.current = false
                  // Limpiar walkTarget en el store
                  useAgentStore.getState().clearWalkTarget(agentName)

                  // Procesar walkTarget pendiente que llegó mientras caminábamos (NG4)
                  const pending = pendingWalkTargetRef.current
                  if (pending) {
                    pendingWalkTargetRef.current = null
                    useAgentStore.setState((s) => ({
                      agents: {
                        ...s.agents,
                        [agentName]: {
                          ...(s.agents[agentName] ?? {
                            status: 'idle', thinkingMessage: null, lastOutput: null, walkTarget: null,
                          }),
                          walkTarget: pending,
                        },
                      },
                    }))
                  }
                },
              })
            }, 1400)
          },
        })
      },
    )
    // Cleanup: desuscribir del store, limpiar timer Y matar todos los tweens GSAP (G2).
    // Sin killTweensOf, GSAP sigue mutando refs de un objeto Three.js ya desmontado
    // → memory leak + posible crash de WebGL context.
    return () => {
      unsub()
      if (returnTimerRef.current) {
        clearTimeout(returnTimerRef.current)
        returnTimerRef.current = null
      }
      // Matar tweens activos en todos los objetos animados por esta caminata
      if (groupRef.current) {
        gsap.killTweensOf(groupRef.current.position)
        gsap.killTweensOf(groupRef.current.rotation)
        gsap.killTweensOf(groupRef.current.scale)
      }
      if (legLRef.current)  gsap.killTweensOf(legLRef.current.rotation)
      if (legRRef.current)  gsap.killTweensOf(legRRef.current.rotation)
      if (armLRef.current)  gsap.killTweensOf(armLRef.current.rotation)
      if (armRRef.current)  gsap.killTweensOf(armRRef.current.rotation)
      if (headRef.current)  gsap.killTweensOf(headRef.current.rotation)
    }
  }, [agentName]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Breathing idle — corre siempre en useFrame ─────────────────────────
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    if (isWalkingRef.current) return  // no respirar durante caminata
    const t = clock.elapsedTime
    groupRef.current.position.y = Math.sin(t * 1.2 + phaseOffset(agentName)) * 0.03
  })
}

// Offset de fase para que los personajes no respiren sincronizados
function phaseOffset(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return (h / 0xffff) * Math.PI * 2
}
