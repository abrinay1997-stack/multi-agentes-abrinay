import { randomUUID } from 'crypto'
import { saveAgentOutput, logError } from '../db/queries'
import { broadcast } from '../services/wsServer'
import type { AgentName } from '@abrinay/shared-types'

export interface RunContext {
  runId: string
  startedAt: number
}

export abstract class BaseAgent {
  abstract readonly name: AgentName
  abstract readonly outputType: string

  protected abstract execute(ctx: RunContext): Promise<unknown>

  async run(ctx: RunContext): Promise<unknown> {
    broadcast({ type: 'agent:start', agentName: this.name, runId: ctx.runId })

    try {
      const output = await this.execute(ctx)

      saveAgentOutput({
        runId: ctx.runId,
        agentName: this.name,
        outputType: this.outputType,
        content: output,
        status: 'completed',
      })

      broadcast({ type: 'agent:complete', agentName: this.name, outputType: this.outputType })
      return output
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)

      logError({
        runId: ctx.runId,
        agentName: this.name,
        errorType: 'execution_error',
        errorDetail: errorMsg,
      })

      broadcast({ type: 'agent:error', agentName: this.name, error: errorMsg })
      throw err
    }
  }

  protected thinking(message: string): void {
    broadcast({ type: 'agent:thinking', agentName: this.name, message })
  }

  protected generateId(prefix: string): string {
    return `${prefix}_${randomUUID().slice(0, 8)}`
  }
}
