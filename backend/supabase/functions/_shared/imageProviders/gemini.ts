/**
 * مزوّد Gemini — **نداء مباشر لـGoogle**، بلا Fal ولا OpenRouter بينهما.
 *
 * قاعدة أمنية (§17): `GEMINI_API_KEY` يُقرأ من بيئة الدالة فقط، وما يُرجَّع
 * للمتصفح ولا يُسجَّل. ولا نسجّل الصور ولا base64 ولا ردّ المزوّد الخام.
 *
 * الفروق العملية عن Fal:
 *   ١. **الصور تدخل مفكوكة** — `inline_data` بنوعها وبياناتها، لا `data:` URL
 *      كاملاً. فنفكّ ما يصلنا قبل الإرسال.
 *   ٢. **الصورة ترجع base64 في الرد** بلا رابط ولا طابور — فما فيه استفسار.
 *   ٣. **`responseModalities` إلزامية**: بدونها يرد النموذج بنصٍّ يصف الصورة
 *      بدل أن يولّدها.
 *
 * ورفض المحتوى هنا **صريح** (`blockReason` أو `finishReason`)، وهذا يفرّقه عن
 * ردٍّ فارغ لعطل: الأول ما ينفع معه مزوّد ثانٍ، والثاني ينفع.
 *
 * ونستعمل REST لا الـSDK: نداء واحد بعقد ثابت، والـSDK يجرّ اعتماديات npm لا
 * تلزم داخل Deno.
 */
import { optionalEnv } from '../env.ts'
import {
  MAX_RESULT_BYTES,
  classify,
  contentRefusal,
  splitDataUrl,
  transportFailure,
  type GenerateInput,
  type ImageGenerationProvider,
} from './types.ts'

type InlinePart = {
  inlineData?: { mimeType?: string; data?: string }
  inline_data?: { mime_type?: string; data?: string }
  text?: string
}

type GeminiPayload = {
  candidates?: { content?: { parts?: InlinePart[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
}

/** أسباب توقّف تعني رفضًا صريحًا — مزوّد ثانٍ يرفضه بنفس السبب. */
const REFUSAL_REASONS = new Set([
  'SAFETY',
  'PROHIBITED_CONTENT',
  'BLOCKLIST',
  'IMAGE_SAFETY',
  'SPII',
  'RECITATION',
])

const key = () => optionalEnv('GEMINI_API_KEY')
const model = () => optionalEnv('GEMINI_IMAGE_MODEL')

/** يقرأ الصورة من الرد أيًّا كانت تسمية الحقل — الرد camelCase والطلب snake. */
function firstInlineImage(payload: GeminiPayload): { mimeType: string; data: string } | undefined {
  for (const candidate of payload.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const inline = part.inlineData ?? part.inline_data
      if (!inline?.data) continue
      const mimeType = (part.inlineData?.mimeType ?? part.inline_data?.mime_type) || 'image/png'
      if (mimeType.startsWith('image/')) return { mimeType, data: inline.data }
    }
  }
  return undefined
}

/** هل رفض النموذج صراحةً؟ */
function refused(payload: GeminiPayload): boolean {
  if (payload.promptFeedback?.blockReason) return true
  return (payload.candidates ?? []).some((candidate) =>
    REFUSAL_REASONS.has(String(candidate.finishReason ?? '').toUpperCase()),
  )
}

export const geminiImageProvider: ImageGenerationProvider = {
  id: 'gemini',

  isConfigured: () => Boolean(key() && model()),

  async generate({ prompt, images, signal }: GenerateInput) {
    const base = optionalEnv(
      'GEMINI_API_BASE',
      'https://generativelanguage.googleapis.com/v1beta',
    ).replace(/\/+$/, '')

    /*
      ترتيب الأجزاء يطابق ترقيم البرومبت: الصور بالتسلسل ثم النص.
      البرومبت يشير للصور بالرقم («reference image 2»)، فأي إعادة ترتيب هنا
      تجعل النموذج يلبس القطعة الغلط.
    */
    const parts: InlinePart[] = []
    for (const image of images) {
      const split = splitDataUrl(image)
      // Gemini ما يقبل رابطًا خارجيًا في inline_data — والصور تصلنا data: أصلاً
      if (!split) throw contentRefusal()
      parts.push({ inline_data: { mime_type: split.mimeType, data: split.data } })
    }
    parts.push({ text: prompt })

    let response: Response
    try {
      response = await fetch(`${base}/models/${model()}:generateContent`, {
        method: 'POST',
        signal,
        headers: {
          'x-goog-api-key': key(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          // بدونها يرد النموذج بنص يصف الصورة بدل أن يولّدها
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      })
    } catch (error) {
      if (signal.aborted) throw classify(408)
      // انقطاع شبكة — عطل طريق يستاهل مزوّدًا ثانيًا
      console.error('gemini unreachable', { name: (error as Error)?.name })
      throw transportFailure()
    }

    if (!response.ok) {
      // ما نسجّل الجسم: يحمل صدى للطلب وفيه صور المستخدمة
      console.error('gemini rejected', { status: response.status })
      throw classify(response.status)
    }

    const payload = (await response.json()) as GeminiPayload

    // الرفض الصريح أولاً: لو فحصنا الصورة أول لصار الرفض «ردًّا بلا صورة»
    // فانتقلنا لمزوّد ثانٍ يرفض بنفس السبب ويستهلك رصيدًا بلا فائدة
    if (refused(payload)) {
      console.error('gemini refused', { reason: payload.promptFeedback?.blockReason ?? 'finish' })
      throw contentRefusal()
    }

    const image = firstInlineImage(payload)
    // رد ناجح بلا صورة ولا رفض = عطل مزوّد، فيستاهل محاولة عند غيره
    if (!image) throw transportFailure()

    // الطول التقريبي قبل الفك: base64 يتمدّد ٤/٣، والفحص هنا أرخص من الفك
    if ((image.data.length * 3) / 4 > MAX_RESULT_BYTES) {
      throw transportFailure('الصورة المولّدة غير صالحة.')
    }

    return { image: `data:${image.mimeType};base64,${image.data}` }
  },
}
