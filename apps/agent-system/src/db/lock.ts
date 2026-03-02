import { getDb } from './client'

interface LockRow {
  run_id: string
  started_at: string
  hours_elapsed: number
}

export function acquireLock(runId: string): boolean {
  const db = getDb()
  try {
    db.prepare(`INSERT INTO run_lock (id, run_id) VALUES (1, ?)`).run(runId)
    return true
  } catch {
    const existing = db.prepare(`
      SELECT *, (julianday('now') - julianday(started_at)) * 24 AS hours_elapsed
      FROM run_lock WHERE id = 1
    `).get() as LockRow | undefined

    if (existing && existing.hours_elapsed > 4) {
      // Run fantasma (crash anterior) — forzar liberación
      releaseLock()
      return acquireLock(runId)
    }
    return false
  }
}

export function releaseLock(): void {
  getDb().prepare(`DELETE FROM run_lock WHERE id = 1`).run()
}

export function getLockStatus(): { locked: boolean; runId?: string; startedAt?: string } {
  const row = getDb().prepare(
    `SELECT run_id, started_at FROM run_lock WHERE id = 1`
  ).get() as { run_id: string; started_at: string } | undefined

  if (!row) return { locked: false }
  return { locked: true, runId: row.run_id, startedAt: row.started_at }
}
