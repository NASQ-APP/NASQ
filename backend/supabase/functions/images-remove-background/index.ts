/**
 * POST /images-remove-background
 *
 * تستقبل صورة قطعة وترجّعها بخلفية شفافة. هذا المكان الوحيد اللي يعرف مزوّد
 * إزالة الخلفية ويملك مفتاحه — ما ينزل المتصفح أبدًا (§17).
 *
 * ترجّع صورة عند النجاح، وJSON فيه `code` عند الفشل، فالواجهة تترجمه لرسالة
 * عربية واحدة معروفة.
 */
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail } from '../_shared/response.ts'
import { optionalEnv } from '../_shared/env.ts'
import { requireUser } from '../_shared/supabase.ts'
import { withinRateLimit } from '../_shared/rateLimit.ts'
import { PROVIDER_TIMEOUT_MS, backgroundRemovalProvider } from '../_shared/backgroundRemoval.ts'

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_BYTES = 12 * 1024 * 1024
const MAX_PER_MINUTE = Number(optionalEnv('BACKGROUND_REMOVAL_PER_MINUTE', '12'))

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  try {
    if (request.method !== 'POST') {
      throw new HandledError('method-not-allowed', 'الطلب غير مدعوم.', 405)
    }

    const user = await requireUser(request)

    if (!withinRateLimit(user.id, MAX_PER_MINUTE)) {
      throw new HandledError('rate-limited', 'طلبات كثيرة بوقت قصير. جرّبي بعد دقيقة.', 429)
    }

    const provider = backgroundRemovalProvider()
    if (!provider) {
      throw new HandledError(
        'not-configured',
        'إزالة الخلفية غير مفعّلة على الخادم حاليًا.',
        503,
      )
    }

    // ---- قراءة الصورة والتحقق منها ----
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
    if (image.size === 0) throw new HandledError('invalid-request', 'الصورة فاضية.', 400)
    if (image.size > MAX_BYTES) {
      throw new HandledError('too-large', 'حجم الصورة أكبر من الحد المسموح.', 413)
    }

    // ---- الاستدعاء بمهلة ----
    const timeout = new AbortController()
    const timer = setTimeout(() => timeout.abort(), PROVIDER_TIMEOUT_MS)

    let result
    try {
      result = await provider.removeBackground(image, timeout.signal)
    } catch (error) {
      if (timeout.signal.aborted) {
        throw new HandledError('timeout', 'انتهت مهلة معالجة الصورة.', 504)
      }
      throw error
    } finally {
      clearTimeout(timer)
    }

    if (result.data.byteLength === 0) {
      throw new HandledError('no-subject', 'ما قدرنا نميّز القطعة في الصورة.', 422)
    }

    return new Response(result.data, {
      headers: {
        ...corsHeaders,
        'content-type': result.contentType,
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    return fail(error)
  }
})
