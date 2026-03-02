import { MOCK_MODE, config } from '../config'

export interface EmailParams {
  to: string
  subject: string
  html: string
}

export interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  if (MOCK_MODE || !config.RESEND_API_KEY) {
    await delay(500)
    console.log('\n[resend:mock] ════════════════════════════════════════════')
    console.log(`[resend:mock]  TO: ${params.to}`)
    console.log(`[resend:mock]  SUBJECT: ${params.subject}`)
    console.log(`[resend:mock]  HTML: ${params.html.length} chars`)
    console.log('[resend:mock] ════════════════════════════════════════════\n')
    return { success: true, id: `mock_${Date.now()}` }
  }

  const { Resend } = await import('resend')
  const resend = new Resend(config.RESEND_API_KEY)

  const attemptSend = async (): Promise<EmailResult> => {
    const result = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL!,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })

    if (result.error) {
      const statusCode = (result.error as { statusCode?: number }).statusCode
      if (statusCode === 422 || statusCode === 403) {
        // Error de configuración — no reintentar
        return { success: false, error: `Config error (${statusCode}): ${result.error.message}` }
      }
      throw Object.assign(new Error(result.error.message), { retryable: true })
    }

    return { success: true, id: result.data?.id }
  }

  try {
    return await attemptSend()
  } catch (err: unknown) {
    const e = err as { retryable?: boolean; message?: string }
    if (!e.retryable) return { success: false, error: e.message }

    // Error de red — 1 reintento con delay de 5s
    await delay(5000)
    try {
      return await attemptSend()
    } catch (retryErr: unknown) {
      const re = retryErr as { message?: string }
      return { success: false, error: `Retry failed: ${re.message}` }
    }
  }
}
