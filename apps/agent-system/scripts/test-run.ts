/**
 * Script de prueba — ejecuta el pipeline una vez y muestra el resultado.
 * Uso: npx tsx scripts/test-run.ts
 *      npm run test:run (desde apps/agent-system)
 */
import '../src/config'  // carga .env primero
import { getDb } from '../src/db/client'
import { startWsServer } from '../src/services/wsServer'
import { runPipeline } from '../src/pipeline/runner'

async function main() {
  console.log('🧪 Test run iniciado...\n')

  getDb()
  startWsServer()

  const result = await runPipeline()
  console.log('Resultado:', result)

  // Esperar a que el pipeline termine (mock: ~45s, real: ~3-5min)
  await new Promise(resolve => setTimeout(resolve, 90000))

  console.log('\n✅ Test run completado')
  process.exit(0)
}

main().catch(err => {
  console.error('[test-run] Error:', err)
  process.exit(1)
})
