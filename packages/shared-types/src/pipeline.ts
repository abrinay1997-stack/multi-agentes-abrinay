export type PipelineState =
  | 'idle'
  | 'initializing'           // verificar tablas + lock
  | 'running_scout'
  | 'running_trend_hunters'  // Kira + Cleo + Orion en Promise.all()
  | 'running_nova'
  | 'running_content_creators' // Zane + Milo + Leo en Promise.all()
  | 'running_qa'             // Vera + Stella + Atlas en Promise.all()
  | 'running_qa_revision'    // feedback loop (máx 1 vez por pieza)
  | 'running_dimitri'
  | 'sending_email'
  | 'inserting_history'
  | 'complete'
  | 'failed'

export interface PipelineRun {
  runId: string
  state: PipelineState
  startedAt: number
  completedAt?: number
  error?: string
}
