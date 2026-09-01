/**
 * ⚠️ **مسار قديم (legacy).** منشور ويعمل — فلا يُحذف ولا يُستبدل الآن.
 *
 * يضرب OpenRouter مباشرة بلا راوتر ولا تصنيف أخطاء ولا انتقال لمزوّد ثانٍ،
 * فصار للتوليد مساران لا يعرف أحدهما الآخر: هذا، و`images-generate` الذي يمرّ
 * بـ`_shared/imageProviders`.
 *
 * صار OpenRouter الآن مزوّدًا مسجّلاً داخل ذاك الراوتر، فالمنطق هنا مكرَّر
 * فعليًا. **الهدف**: توحيده خلف `ImageProviderRouter` بعد التأكد أن المسار
 * الجديد يعطي نفس النتيجة — والتحقق قبل الحذف، لا العكس.
 *
 * ويبقى فرق واحد حقيقي: هنا البرومبت يجي جاهزًا من العميل، وهناك يُبنى على
 * الخادم من صفّ القطعة. التوحيد يعني اعتماد الثاني.
 */

/**
 * POST /tryon
 *
 * توليد صورة الإطلالة. الطلب يحمل الصور والبرومبت، والردّ صورة واحدة.
 *
 * **سبب وجودها**: المفتاح مربوط برصيد مدفوع. لو ناداه المتصفّح مباشرة لانخبز
 * في حزمة البناء وقرأه أي أحد يفتح الموقع — فيولّد على حساب صاحبة المشروع
 * حتى ينفد. هنا يعيش في بيئة الدالة ولا ينزل العميل أبدًا (§17).
 *
 * والبرومبت يُبنى عند العميل عمدًا: هو منطق مجال يعرف القطع والقياسات، ونقله
 * هنا يفرّق المعرفة على مكانين. الدالة تنقل ولا تقرّر.
 *
 * **الجلسة شرط**: التوليد يستهلك مالًا، فما نفتحه لمن ليس عندنا حساب.
 */
import { handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail, ok } from '../_shared/response.ts'
import { optionalEnv, requireEnv } from '../_shared/env.ts'
import { readJson, requireUser } from '../_shared/supabase.ts'
import { withinRateLimit } from '../_shared/rateLimit.ts'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/** مهلة سخيّة: توليد الصور أبطأ من النص بكثير. */
const TIMEOUT_MS = 110_000

/** حاجز حجم — الصور تجي كـ`data:` URL، وطلب ضخم يعلّق الدالة بلا فائدة. */
const MAX_BODY_CHARS = 20_000_000

type GenerateRequest = { images?: unknown; prompt?: unknown }

type Payload = {
  error?: { code?: number; message?: string }
  choices?: {
    message?: {
      content?: string | null
      images?: { image_url?: { url?: string } }[]
    }
  }[]
}

/** حالة HTTP → سبب مفهوم. الرصيد المنتهي غير الضغط، وخلطهما يضلّل. */
function codeFor(status: number): string {
  if (status === 401 || status === 403) return 'not-configured'
  if (status === 402) return 'no-credit'
  if (status === 429) return 'rate-limited'
  if (status === 408 || status === 504) return 'timeout'
  return 'provider-failure'
}

/** الرمز يصل العميل كما هو، فتعرف الواجهة أي رسالة تعرض. */
const providerError = (code: string, status = 502) =>
  new HandledError(code, 'ما قدرنا نولّد الصورة الحين.', status)

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  try {
    const user = await requireUser(request)

    /*
      حدّ المعدّل — الإضافة الوحيدة على النسخة المنشورة.

      المصادقة تحدّ من «أي أحد» لا من «كم مرة»: مستخدمة مسجّلة كانت تقدر
      تستنزف الرصيد بحلقة طلبات على أغلى مسار في التطبيق. نفس المتغيّر ونفس
      الربط بالمعرّف كما في `images-generate`.
    */
    if (!withinRateLimit('tryon:' + user.id, Number(optionalEnv('GENERATE_PER_MINUTE', '10')))) {
      throw new HandledError('rate-limited', 'طلبات كثيرة بوقت قصير.', 429)
    }

    const body = await readJson<GenerateRequest>(request)
    const images = Array.isArray(body.images)
      ? body.images.filter((i): i is string => typeof i === 'string')
      : []
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''

    if (images.length === 0) throw new HandledError('missing-person', 'ما وصلتنا صور.')
    if (!prompt) throw new HandledError('provider-failure', 'الطلب ناقص.')

    const size = images.reduce((total, image) => total + image.length, 0)
    if (size > MAX_BODY_CHARS) {
      throw new HandledError('provider-failure', 'الصور أكبر من اللازم — صغّريها وأعيدي.', 413)
    }

    const key = requireEnv('OPENROUTER_API_KEY')
    const model = optionalEnv('OPENROUTER_IMAGE_MODEL', 'google/gemini-3.1-flash-image')

    // ترتيب الأجزاء يطابق ترقيم البرومبت: الصور بالتسلسل ثم النص
    const content = [
      ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
      { type: 'text', text: prompt },
    ]

    const response = await fetch(API_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        // يعرّفان التطبيق في لوحة OpenRouter — مفيدان لتتبّع الاستهلاك
        'HTTP-Referer': optionalEnv('APP_ORIGIN', 'https://nasq.app'),
        'X-Title': 'NASQ',
      },
      body: JSON.stringify({
        model,
        // بدونها يرد النموذج بنص يصف الصورة بدل أن يولّدها
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      // جسم الرد قد يحمل صدى للطلب — نسجّل الحالة وحدها ولا نعرضها للمستخدمة
      console.error('[tryon] http', response.status, model)
      throw providerError(codeFor(response.status))
    }

    const payload = (await response.json()) as Payload

    // OpenRouter يرجّع أخطاء المزوّد أحيانًا داخل رد ٢٠٠
    if (payload.error) {
      console.error('[tryon] provider', payload.error.code)
      throw providerError(codeFor(payload.error.code ?? 0))
    }

    const image = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url
    if (!image) {
      // رد بنص بلا صورة = رفض النموذج التوليد، لا عطل في الشبكة
      const refused = Boolean(payload.choices?.[0]?.message?.content)
      throw providerError(refused ? 'blocked' : 'provider-failure')
    }

    return ok({ image, createdAt: new Date().toISOString() })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return fail(providerError('timeout', 504))
    }
    return fail(error)
  }
})
