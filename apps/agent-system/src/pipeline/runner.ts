import { orchestrator } from './orchestrator'

export async function runPipeline(): Promise<{
  started: boolean
  runId: string | null
  message: string
}> {
  if (orchestrator.getState() !== 'idle') {
    return {
      started: false,
      runId: orchestrator.getCurrentRunId(),
      message: `Pipeline en ejecución: estado actual "${orchestrator.getState()}"`,
    }
  }

  // Fire-and-forget — el endpoint responde inmediatamente
  const promise = orchestrator.run()

  // Polling con timeout — espera hasta 500ms para que el orchestrator asigne el runId.
  // Mejor que un sleep fijo de 50ms que puede fallar bajo carga (NG5 race condition).
  const MAX_WAIT_MS = 500
  const POLL_INTERVAL_MS = 10
  let waited = 0
  while (!orchestrator.getCurrentRunId() && waited < MAX_WAIT_MS) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    waited += POLL_INTERVAL_MS
  }

  promise.catch(err => {
    console.error('[runner] Error no capturado en pipeline:', err)
  })

  return {
    started: true,
    runId: orchestrator.getCurrentRunId(),
    message: 'Pipeline iniciado',
  }
}
