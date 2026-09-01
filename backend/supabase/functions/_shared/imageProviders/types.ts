/**
 * عقد مزوّدي توليد الصور.
 *
 * المزوّدون يتبدّلون: Fal اليوم وGemini جنبه، وغيرهما غدًا. فالعقد هنا واحد
 * — **نفس البرومبت ونفس الصور بنفس الترتيب** — والنتيجة واحدة، فتتقارب مخرجات
 * المزوّدين بدل ما يصير لكل واحد سلوك خاص يتسرّب للواجهة.
 *
 * والصورة ترجع `data:` URL من الجميع، لا رابط المزوّد: روابطهم مؤقتة، ومسار
 * حفظ الإطلالة في الواجهة ما يرفع للتخزين إلا ما كان `data:` أو `blob:` —
 * فرابط خام يعني إطلالة محفوظة تفقد صورتها بعد أيام.
 */
import { HandledError } from '../response.ts'

export type ProviderId = 'fal' | 'gemini' | 'openrouter'

export type GenerateInput = {
  prompt: string
  /** بترتيب البرومبت نفسه — البرومبت يشير للصور بالرقم. */
  images: string[]
  signal: AbortSignal
}

export type ImageGenerationProvider = {
  readonly id: ProviderId
  /** هل عنده مفتاح ومودل؟ غير المهيَّأ يُسقَط من الترتيب بلا محاولة. */
  isConfigured(): boolean
  generate(input: GenerateInput): Promise<{ image: string }>
}

/**
 * خطأ مزوّد يحمل قراره: هل نجرّب غيره؟
 *
 * الفرق جوهري ويحدّد أين يذهب رصيد المستخدمة. **عطل عند المزوّد** (ضغط،
 * رصيد، مهلة، ٥xx) يستاهل محاولة عند غيره — الطلب سليم والمشكلة في الطريق.
 * أما **خطأ في الطلب** (صورة تالفة، رفض محتوى، بيانات ناقصة) فالمزوّد الثاني
 * يرفضه بنفس السبب، فالمحاولة تستهلك رصيدًا ثانيًا وتؤخّر رسالة الخطأ بلا فائدة.
 */
export class ProviderError extends HandledError {
  readonly retryable: boolean

  constructor(code: string, message: string, status: number, retryable: boolean) {
    super(code, message, status)
    this.retryable = retryable
  }
}

export const isRetryable = (error: unknown): boolean =>
  error instanceof ProviderError && error.retryable

/* ----------------------- تصنيف موحَّد لحالات HTTP ----------------------- */

/**
 * حالة HTTP → سبب مفهوم + هل ننتقل لغيره.
 *
 * يشترك فيه المزوّدان فما يتفرّق التصنيف: لو صار ٤٢٩ عند Fal انتقال وعند
 * Gemini توقّفًا، لصار سلوك التطبيق يعتمد على من صادف أن يكون أولاً.
 */
export function classify(status: number): ProviderError {
  // انتهاء الرصيد: الانتظار ما يحلّه، لكن مزوّدًا ثانيًا له رصيده
  if (status === 402) {
    return new ProviderError('no-credit', 'رصيد التوليد انتهى.', 402, true)
  }
  if (status === 408 || status === 504) {
    return new ProviderError('timeout', 'أخذت وقتًا أطول من المتوقع.', 504, true)
  }
  // الضغط وانتهاء الحصة — مزوّد ثانٍ حصّته مستقلة
  if (status === 429) {
    return new ProviderError('rate-limited', 'طلبات كثيرة بوقت قصير.', 429, true)
  }
  // المودل غير متاح مؤقتًا عند هذا المزوّد وحده
  if (status === 404) {
    return new ProviderError('invalid-model', 'مودل التوليد غير متاح.', 503, true)
  }
  if (status >= 500) {
    return new ProviderError('provider-failure', 'ما قدرنا نجهّز الإطلالة هالمرة.', 502, true)
  }

  // مفتاح غلط أو مرفوض: عطل إعداد عند هذا المزوّد، وغيره قد يكون مضبوطًا
  if (status === 401 || status === 403) {
    return new ProviderError('not-configured', 'التجربة الافتراضية غير مفعّلة.', 503, true)
  }

  // خطأ في الطلب نفسه — المزوّد الثاني يرفضه بنفس السبب
  if (status === 400 || status === 415 || status === 422) {
    return new ProviderError('blocked', 'ما قدرنا نجهّز هذي الإطلالة.', 422, false)
  }

  return new ProviderError('provider-failure', 'ما قدرنا نجهّز الإطلالة هالمرة.', 502, true)
}

/** انقطاع شبكة أو ردّ بلا صورة — عطل طريق، فيستاهل مزوّدًا ثانيًا. */
export const transportFailure = (message = 'ما قدرنا نجهّز الإطلالة هالمرة.'): ProviderError =>
  new ProviderError('provider-failure', message, 502, true)

/**
 * المزوّد لا يقبل **شكل** المدخلات — لا المحتوى.
 *
 * الفرق يحسم أين يذهب الطلب: Gemini يشترط `data:` ويرفض الروابط الخارجية،
 * وfal يقبلها. فقطعة مستوردة من متجر (رابط بلا نسخة عندنا) تُفشل Gemini
 * وتنجح عند fal — وتصنيفها «رفض محتوى» كان يقتل الطلب قبل أن يصل إليه.
 */
export const unsupportedInput = (): ProviderError =>
  new ProviderError('provider-failure', 'ما قدرنا نجهّز الإطلالة هالمرة.', 502, true)

/** رفض صريح بسبب المحتوى — المزوّد الثاني يرفضه أيضًا، فما ننتقل. */
export const contentRefusal = (): ProviderError =>
  new ProviderError('blocked', 'ما قدرنا نجهّز هذي الإطلالة.', 422, false)

/* ------------------------------ مساعدات ------------------------------ */

/** سقف الصورة النازلة — يحمي ذاكرة الدالة من رد ضخم. */
export const MAX_RESULT_BYTES = 20 * 1024 * 1024

/** base64 على دفعات: `btoa` يحتاج نصًا، والتحويل دفعة واحدة يفجّر المكدس. */
export function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(binary)
}

/** يفكّ `data:` URL إلى نوعه وبياناته — Gemini يبعث الصور مفكوكة. */
export function splitDataUrl(url: string): { mimeType: string; data: string } | undefined {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(url)
  return match ? { mimeType: match[1], data: match[2] } : undefined
}
