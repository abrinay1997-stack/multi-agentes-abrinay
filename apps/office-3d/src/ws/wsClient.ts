// WS client SINGLETON — fuera de React, sin rerenders
import { useAgentStore } from '../store/agentStore'
import type { AgentEvent } from '@abrinay/shared-types'

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
const MAX_RETRIES = 5
let retryCount = 0

export function connectWS(url: string): void {
  if (ws && ws.readyState < 2) return  // ya conectado o conectando

  ws = new WebSocket(url)

  ws.onopen = () => {
    retryCount = 0
    useAgentStore.getState().setWsStatus('connected')
    console.log('[ws] Conectado a', url)

    // Heartbeat cada 30s — detecta zombie connections (TCP abierto sin datos)
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30_000)
  }

  ws.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data) as AgentEvent
      useAgentStore.getState().handleWsEvent(event)
    } catch (e) {
      console.warn('[ws] Mensaje no parseable:', e)
    }
  }

  ws.onclose = () => {
    // Limpiar heartbeat al desconectar
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
    useAgentStore.getState().setWsStatus('connecting')
    if (retryCount < MAX_RETRIES) {
      retryCount++
      const delay = Math.min(2000 * retryCount, 30000)
      console.log(`[ws] Reconectando en ${delay}ms (intento ${retryCount}/${MAX_RETRIES})`)
      reconnectTimer = setTimeout(() => connectWS(url), delay)
    } else {
      useAgentStore.getState().setWsStatus('offline')
      console.warn('[ws] Sin conexión tras', MAX_RETRIES, 'intentos — modo offline')
    }
  }

  ws.onerror = () => {
    // onclose se dispara después — no necesitamos log extra
  }
}

export function disconnectWS(): void {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
  ws?.close()
  ws = null
  retryCount = MAX_RETRIES  // evita reconexión automática
}
