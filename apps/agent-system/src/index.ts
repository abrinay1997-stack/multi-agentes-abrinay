import express from 'express'
import path from 'path'
import { config, MOCK_MODE } from './config'
import { getDb } from './db/client'
import { startWsServer } from './services/wsServer'
import { startScheduler } from './pipeline/scheduler'
import { router } from './api'

async function main() {
  // Inicializar DB (crea tablas si no existen)
  getDb()

  // Iniciar WebSocket server
  startWsServer()

  // Iniciar HTTP server
  const app = express()

  // CORS para desarrollo local
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    next()
  })

  app.options('*', (_req, res) => res.sendStatus(204))
  app.use(express.json())
  app.use('/api', router)

  // En producción: servir el frontend 3D estático desde office-3d/dist
  if (process.env.NODE_ENV === 'production') {
    const staticDir = path.resolve(__dirname, '../../../office-3d/dist')
    app.use(express.static(staticDir))
    // SPA fallback — todas las rutas no-API sirven index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'))
    })
  }

  app.listen(config.AGENT_SERVER_PORT, () => {
    console.log(`[http] Express en puerto ${config.AGENT_SERVER_PORT}`)
  })

  // Iniciar cron scheduler
  startScheduler()

  console.log('\n🎵 Abrinay Multi-Agent System — ONLINE')
  console.log(`   HTTP:  http://localhost:${config.AGENT_SERVER_PORT}/api/health`)
  console.log(`   WS:    ws://localhost:${config.WS_PORT}`)
  console.log(`   Modo:  ${MOCK_MODE ? 'MOCK (sin API keys)' : 'REAL'}\n`)

  process.on('SIGINT', () => {
    console.log('\n[shutdown] SIGINT recibido — cerrando...')
    process.exit(0)
  })
}

main().catch(err => {
  console.error('[fatal]', err)
  process.exit(1)
})
