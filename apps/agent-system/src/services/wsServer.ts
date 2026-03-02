import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import type { AgentEvent } from '@abrinay/shared-types'

let wss: WebSocketServer | null = null
const clients = new Set<WebSocket>()

// ─── Replay state para nuevas conexiones ──────────────────────────────────
// Almacena los últimos eventos de pipeline para enviarlos al conectar.
// - Durante pipeline activo: start + último progress → cliente ve progreso actual.
// - Tras pipeline terminado: latestCompleteEvent → cliente ve resumen del último run.
// Esto evita que un cliente que se conecta post-run vea estado vacío.
let latestStartEvent: AgentEvent | null = null
let latestProgressEvent: AgentEvent | null = null
let latestCompleteEvent: AgentEvent | null = null

// httpServer: el servidor HTTP de Express ya creado.
// Railway (y cualquier PaaS) expone UN solo puerto por servicio —
// adjuntar WS al mismo servidor evita necesitar un segundo puerto.
export function startWsServer(httpServer: Server): WebSocketServer {
  if (wss) return wss

  wss = new WebSocketServer({ server: httpServer, path: '/ws' })

  wss.on('connection', (ws) => {
    clients.add(ws)
    console.log(`[ws] Cliente conectado (total: ${clients.size})`)

    // Replay: sincronizar cliente nuevo con el estado del pipeline
    // Pipeline activo → enviar start + último progress (para mostrar barra)
    // Pipeline terminado → enviar complete (para mostrar resumen del último run)
    if (latestStartEvent && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(latestStartEvent))
    }
    if (latestProgressEvent && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(latestProgressEvent))
    }
    if (!latestStartEvent && latestCompleteEvent && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(latestCompleteEvent))
    }

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`[ws] Cliente desconectado (total: ${clients.size})`)
    })

    ws.on('error', (err) => {
      console.error('[ws] Error de cliente:', err.message)
      clients.delete(ws)
    })
  })

  wss.on('error', (err) => {
    console.error('[ws] Error del servidor:', err.message)
  })

  console.log(`[ws] WebSocket server en /ws (comparte puerto HTTP)`)
  return wss
}

export function broadcast(event: AgentEvent): void {
  // Actualizar cache de replay según el tipo de evento
  if (event.type === 'pipeline:start') {
    latestStartEvent = event
    latestProgressEvent = null          // reset progress al iniciar nuevo run
    latestCompleteEvent = null          // nuevo run invalida el complete anterior
  } else if (event.type === 'pipeline:progress') {
    latestProgressEvent = event
  } else if (event.type === 'pipeline:complete') {
    latestStartEvent = null             // pipeline terminado — limpiar activos
    latestProgressEvent = null
    latestCompleteEvent = event         // guardar complete para replay post-run
  }

  const payload = JSON.stringify(event)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  }
}

export function getClientCount(): number {
  return clients.size
}
