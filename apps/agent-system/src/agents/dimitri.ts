import { BaseAgent, type RunContext } from './base'
import { callClaude } from '../services/claude'
import { sendEmail } from '../services/resend'
import { getAgentOutput, logError } from '../db/queries'
import { MODEL_SONNET, extractJson } from './abrinay'
import { getAgentConfig } from '../db/agentConfigs'
import { buildConfigAdditions } from './configHelpers'
import type { AgentName } from '@abrinay/shared-types'
import type { QAResultTikTok } from './qa/vera'
import type { QAResultInstagram } from './qa/stella'
import type { QAResultYouTube } from './qa/atlas'

const DESTINATARIO = 'abrinay1997@gmail.com'

// Colores del template (bloqueados — no modificar)
const COLORS = {
  bg: '#0a0a0a',
  tiktok: '#FF2D55',
  instagram: '#833AB4',
  youtube: '#FF0000',
  accent: '#ff4d8d',
  qa: '#FFD700',
  text: '#ffffff',
  textMuted: '#888888',
}

interface DimitriOutput {
  emailId?: string
  emailSent: boolean
  totalApproved: number
  totalDiscarded: number
  summary: string
}

export class DimitriAgent extends BaseAgent {
  readonly name: AgentName = 'dimitri'
  readonly outputType = 'email_report'

  protected async execute(ctx: RunContext): Promise<DimitriOutput> {
    this.thinking('Sintetizando estrategia omnicanal...')

    const cfg = getAgentConfig(this.name)
    const additions = buildConfigAdditions(cfg)

    // Recopilar todos los resultados QA
    const veraResults = (getAgentOutput(ctx.runId, 'vera', 'qa_results') as { results: QAResultTikTok[] } | null)?.results ?? []
    const stellaResults = (getAgentOutput(ctx.runId, 'stella', 'qa_results') as { results: QAResultInstagram[] } | null)?.results ?? []
    const atlasResults = (getAgentOutput(ctx.runId, 'atlas', 'qa_results') as { results: QAResultYouTube[] } | null)?.results ?? []

    const allResults = [...veraResults, ...stellaResults, ...atlasResults]
    const approved = allResults.filter(r => r.status === 'aprobado')
    const discarded = allResults.filter(r => r.status === 'descartado')

    const tiktokApproved = veraResults.filter(r => r.status === 'aprobado')
    const igApproved = stellaResults.filter(r => r.status === 'aprobado')
    const ytApproved = atlasResults.filter(r => r.status === 'aprobado')

    this.thinking('Redactando email estratégico...')

    const htmlResponse = await callClaude({
      model: MODEL_SONNET,
      system: cfg.systemPrompt ?? `Eres Dimitri, director creativo y estratega omnicanal para artistas urbanos.
Tienes el tono de un colombiano-panameño experimentado: directo, brillante, con un toque de humor panameño.
Escribes emails HTML que son visualmente impactantes y estratégicamente valiosos.
Usas los colores y estructura exactos que se te dan. Respondes con HTML puro, sin markdown.`,
      messages: [{
        role: 'user',
        content: this.buildPrompt(ctx.runId, tiktokApproved, igApproved, ytApproved, discarded, additions),
      }],
      maxTokens: 8192,
      mockKey: 'email_dimitri',
    })

    let htmlContent: string
    if (htmlResponse.trim().startsWith('<')) {
      htmlContent = htmlResponse
    } else {
      try {
        const parsed = extractJson(htmlResponse) as { html?: string }
        htmlContent = parsed.html ?? htmlResponse
      } catch {
        htmlContent = htmlResponse
      }
    }

    if (!htmlContent.includes('<!DOCTYPE')) {
      htmlContent = this.wrapWithTemplate(htmlContent)
    }

    this.thinking('Enviando a abrinay1997@gmail.com...')

    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    const emailResult = await sendEmail({
      to: DESTINATARIO,
      subject: `🎵 Estrategia Licencia P — ${fecha} | Abrinay`,
      html: htmlContent,
    })

    if (!emailResult.success) {
      logError({
        runId: ctx.runId,
        agentName: 'dimitri',
        errorType: 'email_send_error',
        errorDetail: emailResult.error ?? 'Error desconocido al enviar email',
      })
    }

    return {
      emailId: emailResult.id,
      emailSent: emailResult.success,
      totalApproved: approved.length,
      totalDiscarded: discarded.length,
      summary: `${approved.length} piezas aprobadas, ${discarded.length} descartadas. Email: ${emailResult.success ? 'enviado' : 'FALLIDO'}`,
    }
  }

  private buildPrompt(
    _runId: string,
    tiktokApproved: QAResultTikTok[],
    igApproved: QAResultInstagram[],
    ytApproved: QAResultYouTube[],
    discarded: (QAResultTikTok | QAResultInstagram | QAResultYouTube)[],
    additions: string
  ): string {
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

    const tiktokSection = tiktokApproved.length > 0
      ? tiktokApproved.map(r => `- ${r.pieza_id} (score: ${r.score_general}/10, hook: ${r.score_hook}/10)\n  Contenido: ${JSON.stringify(r.contenido_final)}`).join('\n')
      : '⚠️ SIN CONTENIDO APROBADO PARA TIKTOK en este ciclo.'

    const igSection = igApproved.length > 0
      ? igApproved.map(r => `- ${r.pieza_id} (score: ${r.score_general}/10)\n  Contenido: ${JSON.stringify(r.contenido_final)}`).join('\n')
      : '⚠️ SIN CONTENIDO APROBADO PARA INSTAGRAM en este ciclo.'

    const ytSection = ytApproved.length > 0
      ? ytApproved.map(r => `- ${r.pieza_id} (CTR est: ${r.score_ctr}%, score: ${r.score_general}/10)\n  Contenido: ${JSON.stringify(r.contenido_final)}`).join('\n')
      : '⚠️ SIN CONTENIDO APROBADO PARA YOUTUBE en este ciclo.'

    const discardedSection = discarded.length > 0
      ? discarded.map(r => `- ${r.pieza_id}: ${r.problema ?? 'No cumplió estándares QA'}`).join('\n')
      : ''

    return `Crea un email HTML completo para Abrinay con la estrategia de contenido del ${fecha}.

COLORES OBLIGATORIOS:
- Fondo: ${COLORS.bg}
- TikTok: ${COLORS.tiktok}
- Instagram: ${COLORS.instagram}
- YouTube: ${COLORS.youtube}
- Acento/links: ${COLORS.accent}
- Notas QA: ${COLORS.qa}
- Max-width: 480px (mobile-first)

CONTENIDO TIKTOK APROBADO:
${tiktokSection}

CONTENIDO INSTAGRAM APROBADO:
${igSection}

CONTENIDO YOUTUBE APROBADO:
${ytSection}

${discarded.length > 0 ? `PIEZAS RECHAZADAS:\n${discardedSection}` : ''}

ESTRUCTURA DEL EMAIL (orden OBLIGATORIO):
1. Header: "🎵 Estrategia de Contenido Omnicanal / Abrinay — Campaña Licencia P / ${fecha}"
2. Resumen Ejecutivo (3-4 líneas)
3. Parrilla de Contenido (tabla con fechas)
4. TikTok — guiones/contenidos aprobados completos
5. Instagram — piezas aprobadas
6. YouTube — videos aprobados
7. Calendario de Publicación Sugerido
8. Hashtags Estratégicos por plataforma
9. Sinergias Omnicanal
${discarded.length > 0 ? '10. Piezas Rechazadas\n' : ''}11. Nota personal de Dimitri (modismo panameño + referencia a Licencia P)
12. Footer minimal

Devuelve HTML completo con <!DOCTYPE html>, inline styles. Sin markdown, solo HTML puro.${additions}`
  }

  private wrapWithTemplate(content: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Estrategia Licencia P — Abrinay</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${COLORS.text};">
<div style="max-width:480px;margin:0 auto;padding:20px;">
${content}
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #222;text-align:center;color:${COLORS.textMuted};font-size:12px;">
  Sistema Multi-Agente Abrinay · Generado automáticamente · abrinay1997@gmail.com
</div>
</div>
</body>
</html>`
  }
}
