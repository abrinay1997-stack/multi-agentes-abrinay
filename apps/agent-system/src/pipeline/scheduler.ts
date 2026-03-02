import cron from 'node-cron'
import { orchestrator } from './orchestrator'

let task: cron.ScheduledTask | null = null

export function startScheduler(): void {
  // Expresión: "0 7 */3 * *" → 7:00 AM, días 1,4,7,10...28,31 del mes (America/Bogota UTC-5)
  //
  // ⚠️ COMPORTAMIENTO EN LÍMITES DE MES (NM6):
  // "*/3" significa dayOfMonth % 3 == 0, NO "cada 72 horas".
  // Si el mes tiene 31 días: dispara día 28 y día 31 (intervalo 3 días ✓),
  // pero luego dispara día 1 del mes siguiente (1 día después ✗).
  // Meses con 30 días: día 30 y día 1 siguiente = 1 día de intervalo.
  //
  // Impacto real: 1-2 veces por año el pipeline corre dos veces seguidas
  // con solo 24h de diferencia en lugar de 72h. El run_lock evita ejecuciones
  // CONCURRENTES, pero no secuenciales. El contenido generado sería duplicado.
  //
  // Alternativa exacta: setInterval(72 * 3600 * 1000) desde el inicio del proceso.
  // Se mantiene el cron porque es más predecible en horario fijo (7:00 AM) y
  // la duplicación puntual en límites de mes es aceptable para este proyecto.
  // Timezone configurable via variable de entorno CRON_TIMEZONE (N4).
  // Default: America/Bogota (UTC-5) — zona horaria de Abrinay.
  // Para cambiar sin modificar código: CRON_TIMEZONE=America/Panama en el .env
  const tz = process.env['CRON_TIMEZONE'] ?? 'America/Bogota'

  task = cron.schedule('0 7 */3 * *', () => {
    console.log('[scheduler] Cron disparado — iniciando pipeline')
    orchestrator.run().catch(err => {
      console.error('[scheduler] Error al iniciar pipeline:', err)
    })
  }, {
    timezone: tz,
  })

  console.log(`[scheduler] Cron activo: "0 7 */3 * *" (${tz})`)
}

export function stopScheduler(): void {
  task?.stop()
  task = null
  console.log('[scheduler] Cron detenido')
}
