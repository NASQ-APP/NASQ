/**
 * POST /images-analyze
 *
 * تقرأ صورة قطعة وترجّع **اقتراحات** لحقولها (A-07): الفئة والشكل واللون
 * والاسم. كلها اقتراحات قابلة للتعديل في الواجهة، مو قيمًا نهائية.
 *
 * هذا المكان الوحيد اللي يعرف مزوّد الرؤية ويملك مفتاحه (§17).
 * ترجّع `{}` لو ما فيه مزوّد — التصنيف كماليّ، وغيابه ما يوقف إضافة القطعة.
 */
import { handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail, ok } from '../_shared/response.ts'
import { optionalEnv } from '../_shared/env.ts'
import { requireUser } from '../_shared/supabase.ts'
import { withinRateLimit } from '../_shared/rateLimit.ts'
import { VISION_TIMEOUT_MS, visionProvider } from '../_shared/vision.ts'

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_BYTES = 12 * 1024 * 1024
const MAX_PER_MINUTE = Number(optionalEnv('VISION_PER_MINUTE', '20'))

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  try {
    if (request.method !== 'POST') {
      throw new HandledError('method-not-allowed', 'الطلب غير مدعوم.', 405)
    }

    const user = await requireUser(request)

    if (!withinRateLimit('vision:' + user.id, MAX_PER_MINUTE)) {
      throw new HandledError('rate-limited', 'طلبات كثيرة بوقت قصير.', 429)
    }

    const provider = visionProvider()
    // ما فيه مزوّد: نرجّع اقتراحات فاضية بدل خطأ، فالواجهة تكمّل باللون المحلي
    if (!provider) return ok({})

    let image: File | null = null
    try {
      const form = await request.formData()
      const field = form.get('image')
      if (field instanceof File) image = field
    } catch {
      throw new HandledError('invalid-request', 'تعذّر قراءة الصورة.', 400)
    }

    if (!image) throw new HandledError('invalid-request', 'ما وصلتنا صورة.', 400)
    if (!ACCEPTED_TYPES.has(image.type)) {
      throw new HandledError('unsupported-type', 'صيغة الصورة غير مدعومة.', 415)
    }
    if (image.size === 0 || image.size > MAX_BYTES) {
      throw new HandledError('invalid-request', 'حجم الصورة غير صالح.', 413)
    }

    const timeout = new AbortController()
    const timer = setTimeout(() => timeout.abort(), VISION_TIMEOUT_MS)

    try {
      const analysis = await provider.analyze(image, timeout.signal)
      // العملية والمزوّد والنتيجة فقط — لا مفاتيح ولا بايتات صورة (§6)
      console.info('[analyze]', {
        operation: 'analyze-garment',
        provider: provider.id,
        outcome: 'success',
        fields: Object.keys(analysis).length,
      })
      return ok(analysis)
    } catch (error) {
      console.error('[analyze]', { operation: 'analyze-garment', provider: provider.id, outcome: 'failure' })
      if (timeout.signal.aborted) {
        throw new HandledError('timeout', 'انتهت مهلة قراءة الصورة.', 504)
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  } catch (error) {
    return fail(error)
  }
})
