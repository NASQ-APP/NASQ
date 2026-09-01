import { corsFor, corsHeaders } from './cors.ts'

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

/**
 * `request` يُمرَّر ليطابق الرد أصلَ الطلب.
 *
 * بدونه يحمل الرد الأصل المضبوط في البيئة، فينجح الـpreflight ثم يُحجب الرد
 * الفعلي — وهو أسوأ من رفض صريح: الطلب يصل الخادم ويُنفَّذ ويُخصم رصيده، ثم
 * يرميه المتصفح.
 */
const json = (body: unknown, status: number, request?: Request): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(request ? corsFor(request) : corsHeaders),
      'content-type': 'application/json; charset=utf-8',
    },
  })

export const ok = <T>(body: T, request?: Request): Response => json(body, 200, request)

export const fail = (error: unknown, request?: Request): Response => {
  if (error instanceof HandledError) {
    return json({ code: error.code, message: error.message }, error.status, request)
  }
  // لا تسريب لتفاصيل داخلية: تُسجَّل ولا تُرسَل
  console.error('unhandled', error)
  return json({ code: 'provider-failure', message: 'ما قدرنا نكمّل الطلب الحين.' }, 500, request)
}
