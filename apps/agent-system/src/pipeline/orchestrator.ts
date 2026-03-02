import { randomUUID } from 'crypto'
import { broadcast } from '../services/wsServer'
import { acquireLock, releaseLock } from '../db/lock'
import { insertContentHistory } from '../db/queries'
import { ScoutAgent } from '../agents/scout'
import { KiraAgent } from '../agents/kira'
import { CleoAgent } from '../agents/cleo'
import { OrionAgent } from '../agents/orion'
import { NovaAgent } from '../agents/nova'
import { ZaneAgent } from '../agents/zane'
import { MiloAgent } from '../agents/milo'
import { LeoAgent } from '../agents/leo'
import { VeraAgent, type QAResultTikTok } from '../agents/qa/vera'
import { StellaAgent, type QAResultInstagram } from '../agents/qa/stella'
import { AtlasAgent, type QAResultYouTube } from '../agents/qa/atlas'
import { DimitriAgent } from '../agents/dimitri'
import type { PipelineState, RunSummary } from '@abrinay/shared-types'
import type { RunContext } from '../agents/base'

const TOTAL_STEPS = 10

export class PipelineOrchestrator {
  private state: PipelineState = 'idle'
  private currentRunId: string | null = null

  getState(): PipelineState { return this.state }
  getCurrentRunId(): string | null { return this.currentRunId }

  private setState(next: PipelineState): void {
    this.state = next
    console.log(`[orchestrator] → ${next}`)
  }

  private progress(runId: string, step: number): void {
    broadcast({ type: 'pipeline:progress', runId, step, totalSteps: TOTAL_STEPS })
  }

  // Envuelve una promesa con un timeout absoluto. Si el pipeline se cuelga
  // (LLM no responde, red zombie) esta guard lo mata después de maxMs milisegundos.
  private withTimeout<T>(promise: Promise<T>, maxMs: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`[timeout] "${label}" superó ${maxMs / 60_000} min`)),
        maxMs,
      )
      promise.then(
        (v) => { clearTimeout(timer); resolve(v) },
        (e) => { clearTimeout(timer); reject(e) },
      )
    })
  }

  async run(): Promise<void> {
    if (this.state !== 'idle') {
      console.log(`[orchestrator] Omitido — estado: ${this.state}`)
      return
    }

    const runId = `run_${Date.now()}_${randomUUID().slice(0, 8)}`
    if (!acquireLock(runId)) {
      console.log('[orchestrator] No se pudo adquirir lock — otro run activo')
      return
    }

    this.currentRunId = runId
    const startedAt = Date.now()
    broadcast({ type: 'pipeline:start', runId, timestamp: startedAt })
    this.setState('initializing')

    let summary: RunSummary = { runId, totalApproved: 0, totalDiscarded: 0, emailSent: false, duration: 0 }

    try {
      // Timeout global: 60 min máximo. Evita que un agente colgado deje el
      // sistema en estado running_* indefinidamente (bloquea lock + UI).
      summary = await this.withTimeout(this.executeSteps(runId, startedAt), 60 * 60_000, 'pipeline completo')
      this.setState('complete')
      broadcast({ type: 'pipeline:complete', runId, timestamp: Date.now(), summary })
      console.log(`[orchestrator] ✅ Completado — ${summary.totalApproved} aprobadas, ${summary.totalDiscarded} descartadas`)
    } catch (err) {
      this.setState('failed')
      console.error('[orchestrator] ❌ Pipeline falló:', err)
    } finally {
      releaseLock()
      this.currentRunId = null
      setTimeout(() => { if (this.state === 'complete' || this.state === 'failed') this.setState('idle') }, 5000)
    }
  }

  private async executeSteps(runId: string, startedAt: number): Promise<RunSummary> {
    const ctx: RunContext = { runId, startedAt }

    // ─── PASO 0: Scout ───────────────────────────────────────
    this.setState('running_scout')
    this.progress(runId, 1)
    await new ScoutAgent().run(ctx)

    // ─── PASO 1+2+3: Trend Hunters en paralelo ───────────────
    this.setState('running_trend_hunters')
    this.progress(runId, 2)
    await Promise.all([
      new KiraAgent().run(ctx),
      new CleoAgent().run(ctx),
      new OrionAgent().run(ctx),
    ])
    this.progress(runId, 3)  // trend hunters completados (step 3)

    // ─── PASO 4: Nova — Estrategia Editorial ─────────────────
    this.setState('running_nova')
    this.progress(runId, 4)
    await new NovaAgent().run(ctx)

    // ─── PASO 5+6+7: Content Creators en paralelo ────────────
    this.setState('running_content_creators')
    this.progress(runId, 5)
    await Promise.all([
      new ZaneAgent().run(ctx),
      new MiloAgent().run(ctx),
      new LeoAgent().run(ctx),
    ])
    this.progress(runId, 6)  // content creators completados (step 6)

    // ─── PASO 8: QA Triple en paralelo ───────────────────────
    this.setState('running_qa')
    this.progress(runId, 7)
    const [veraOut, stellaOut, atlasOut] = await Promise.all([
      new VeraAgent().run(ctx),
      new StellaAgent().run(ctx),
      new AtlasAgent().run(ctx),
    ]) as [
      { results: QAResultTikTok[] },
      { results: QAResultInstagram[] },
      { results: QAResultYouTube[] },
    ]

    // ─── PASO 9: Insertar historial ───────────────────────────
    this.setState('inserting_history')
    this.progress(runId, 8)
    this.insertHistory(runId, veraOut.results, stellaOut.results, atlasOut.results)

    // ─── PASO 10: Dimitri — Genera email y lo envía ───────────
    this.setState('running_dimitri')
    this.progress(runId, 9)
    const dimitriOut = await new DimitriAgent().run(ctx) as {
      emailSent: boolean
      totalApproved: number
      totalDiscarded: number
    }

    return {
      runId,
      totalApproved: dimitriOut.totalApproved,
      totalDiscarded: dimitriOut.totalDiscarded,
      emailSent: dimitriOut.emailSent,
      duration: Date.now() - startedAt,
    }
  }

  private insertHistory(
    runId: string,
    veraResults: QAResultTikTok[],
    stellaResults: QAResultInstagram[],
    atlasResults: QAResultYouTube[]
  ): void {
    const today = new Date().toISOString().split('T')[0]

    // TikTok
    for (const r of veraResults) {
      const guion = r.contenido_final as { hook?: string; audio_sugerido?: string } | undefined
      try {
        insertContentHistory({
          runId,
          fecha: today,
          plataforma: 'TikTok',
          formato: 'video_corto',
          titulo: guion?.hook?.slice(0, 80) ?? r.pieza_id,
          hook: guion?.hook ?? '',
          scoreGeneral: r.score_general,
          scoreHook: r.score_hook,
          audioSugerido: guion?.audio_sugerido,
          status: r.status,
          razonDescarte: r.problema,
          licenciaP: 1,
        })
      } catch (e) {
        console.error(`[orchestrator] Error insertando historial TikTok ${r.pieza_id}:`, e)
      }
    }

    // Instagram
    for (const r of stellaResults) {
      const item = r.contenido_final as { caption?: string; hook_visual?: string; slides?: { copy: string }[] } | undefined
      const hook = (item as { hook_visual?: string })?.hook_visual
        ?? (item as { slides?: { copy: string }[] })?.slides?.[0]?.copy
        ?? ''
      try {
        insertContentHistory({
          runId,
          fecha: today,
          plataforma: 'Instagram',
          formato: r.pieza_id.includes('reel') ? 'reel' : 'carrusel',
          titulo: hook.slice(0, 80) || r.pieza_id,
          hook,
          scoreGeneral: r.score_general,
          status: r.status,
          razonDescarte: r.problema,
          licenciaP: 1,
        })
      } catch (e) {
        console.error(`[orchestrator] Error insertando historial Instagram ${r.pieza_id}:`, e)
      }
    }

    // YouTube
    for (const r of atlasResults) {
      const item = r.contenido_final as { titulo_seo?: string; titulo?: string; gancho_apertura?: string; hook_3seg?: string } | undefined
      try {
        insertContentHistory({
          runId,
          fecha: today,
          plataforma: 'YouTube',
          formato: r.pieza_id.includes('short') ? 'short' : 'video_largo',
          titulo: item?.titulo_seo ?? item?.titulo ?? r.pieza_id,
          hook: item?.gancho_apertura ?? item?.hook_3seg ?? '',
          scoreGeneral: r.score_general,
          scoreCtr: r.score_ctr,
          status: r.status,
          razonDescarte: r.problema,
          licenciaP: 1,
        })
      } catch (e) {
        console.error(`[orchestrator] Error insertando historial YouTube ${r.pieza_id}:`, e)
      }
    }
  }
}

export const orchestrator = new PipelineOrchestrator()
