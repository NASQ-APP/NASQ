import { corsHeaders } from './cors.ts'

/** رمز خطأ + رسالة بلغة بشر — الخطأ الخام ما يوصل الواجهة أبدًا (A-05). */
export class HandledError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' },
  })

export const ok = <T>(body: T): Response => json(body, 200)

export const fail = (error: unknown): Response => {
  if (error instanceof HandledError) {
    return json({ code: error.code, message: error.message }, error.status)
  }
  // لا تسريب لتفاصيل داخلية: تُسجَّل ولا تُرسَل
  console.error('unhandled', error)
  return json({ code: 'provider-failure', message: 'ما قدرنا نكمّل الطلب الحين.' }, 500)
}
