/**
 * عقود التجربة الافتراضية.
 *
 * التطبيق يتكلم مع `AIImageProvider` ولا يعرف من ينفّذه. اليوم OpenRouter يُنادى
 * من المتصفح (نموذج أولي محلي)، وغدًا يصير خلف خادم — والفرق ملف تنفيذ واحد،
 * بلا لمس أي مكوّن واجهة.
 *
 * الصور تُمرَّر كـ`data:` URL: صور القطع تعيش في IndexedDB داخل المتصفح، فما
 * فيه رابط عام لها أصلاً.
 */
import type { BodySlot } from '@/domain/shared/types'

/** صورة جاهزة للإرسال — data URL أو رابط عام. */
export type ImageReference = string

export type GarmentReference = {
  id: string
  /** فئة القطعة كما يفهمها النموذج: shirt · trousers · blazer… */
  category: string
  slot: BodySlot
  /** اسم القطعة كما سمّتها المستخدمة — يدخل البرومبت لتوضيح المقصود */
  name: string
  colorName: string
  image: ImageReference
}

/**
 * قياسات تقريبية.
 *
 * **إرشاد بصري لا هندسة**: ما نحوّل السنتيمتر إلى بكسل، ولا ندّعي أن النتيجة
 * مقاس مضمون. الغاية تقريب التناسب لا قياسه.
 */
export type BodyParameters = {
  heightCm?: number
  weightKg?: number
  chestCm?: number
  waistCm?: number
  hipsCm?: number
  shoulderWidthCm?: number
  inseamCm?: number
}

export type TryOnInput = {
  personImage: ImageReference
  garments: GarmentReference[]
  bodyParameters?: BodyParameters
  /** طلب إضافي بلغة المستخدمة */
  instruction?: string
}

export type AdaptModelInput = {
  baseImage: ImageReference
  bodyParameters: BodyParameters
  /** «خصر أضيق شوي» — تُضاف لتعليمات التعديل */
  refinement?: string
}

export type ReplaceGarmentInput = {
  /** الإطلالة المولّدة الحالية — نبني عليها بدل ما نبدأ من الصفر */
  currentLook: ImageReference
  garment: GarmentReference
  /** القطع الباقية التي يجب ألا تتغيّر */
  keep: GarmentReference[]
}

export type RemoveGarmentInput = {
  currentLook: ImageReference
  /** ما يُزال */
  garment: GarmentReference
  keep: GarmentReference[]
}

export type RegenerateLookInput = TryOnInput & {
  /** المحاولة السابقة — تُستعمل مرجعًا حتى لا يتغيّر الشخص بين المحاولات */
  previousLook?: ImageReference
}

export type ImageResult = {
  /** الصورة الناتجة — data URL */
  image: ImageReference
  /** ما نفّذه المزوّد فعلاً — يُعرض للمستخدمة، ما يُخفى */
  notice?: string
  createdAt: string
}

/** مراحل معلنة أثناء الانتظار — بلغة المستخدمة لا بلغة المزوّد. */
export type TryOnStage = 'model' | 'garments' | 'compose' | 'finalize'

export const STAGE_LABELS: { id: TryOnStage; label: string }[] = [
  { id: 'model', label: 'نجهّز الموديل…' },
  { id: 'garments', label: 'نجهّز قطع الإطلالة…' },
  { id: 'compose', label: 'نركّب إطلالتك…' },
  { id: 'finalize', label: 'اللمسات الأخيرة…' },
]

export type OnStage = (stage: TryOnStage) => void

/**
 * الواجهة التي يعرفها التطبيق.
 *
 * ست عمليات، كلها تُرجع صورة. أي مزوّد قادم ينفّذ هذي الواجهة ويُستبدل بسطر
 * واحد في `infrastructure/ai/index.ts`.
 */
export interface AIImageProvider {
  readonly id: string
  adaptModel(input: AdaptModelInput, onStage?: OnStage, signal?: AbortSignal): Promise<ImageResult>
  generateTryOn(input: TryOnInput, onStage?: OnStage, signal?: AbortSignal): Promise<ImageResult>
  replaceGarment(
    input: ReplaceGarmentInput,
    onStage?: OnStage,
    signal?: AbortSignal,
  ): Promise<ImageResult>
  removeGarment(
    input: RemoveGarmentInput,
    onStage?: OnStage,
    signal?: AbortSignal,
  ): Promise<ImageResult>
  regenerateLook(
    input: RegenerateLookInput,
    onStage?: OnStage,
    signal?: AbortSignal,
  ): Promise<ImageResult>
}

/* ------------------------------ الأخطاء ------------------------------ */

export type TryOnErrorCode =
  | 'not-configured'
  | 'missing-person'
  | 'missing-garments'
  | 'invalid-image'
  | 'blocked'
  | 'rate-limited'
  /** الرصيد انتهى — غير الضغط: الانتظار ما يحلّه */
  | 'no-credit'
  | 'timeout'
  | 'provider-failure'

export class TryOnError extends Error {
  code: TryOnErrorCode
  hint?: string

  constructor(code: TryOnErrorCode, message: string, hint?: string) {
    super(message)
    this.name = 'TryOnError'
    this.code = code
    this.hint = hint
  }
}

/** رسائل بلغة بشر — الخطأ الخام من المزوّد ما يوصل المستخدمة أبدًا. */
export const ERROR_MESSAGES: Record<TryOnErrorCode, { message: string; hint?: string }> = {
  'not-configured': {
    message: 'التجربة الافتراضية غير مفعّلة.',
    hint: 'ضيفي VITE_OPENROUTER_API_KEY في frontend/.env وأعيدي تشغيل الخادم.',
  },
  'missing-person': {
    message: 'اختاري موديلاً أو ارفعي صورتك أول.',
  },
  'missing-garments': {
    message: 'اختاري قطعة واحدة على الأقل من خزانتك.',
  },
  'invalid-image': {
    message: 'ما قدرنا نقرأ إحدى الصور.',
    hint: 'جرّبي صورة أوضح.',
  },
  blocked: {
    message: 'ما قدرنا نجهّز هذي الإطلالة.',
    hint: 'جرّبي قطعًا أخرى أو صورة ثانية.',
  },
  'rate-limited': {
    message: 'طلبات كثيرة بوقت قصير.',
    hint: 'انتظري دقيقة وجرّبي.',
  },
  // ما نقول «انتظري»: الانتظار ما يرجّع رصيدًا، والنصيحة الخاطئة أسوأ من لا شيء
  'no-credit': {
    message: 'رصيد التوليد انتهى.',
    hint: 'اشحني رصيدك في OpenRouter وجرّبي.',
  },
  timeout: {
    message: 'أخذت وقتًا أطول من المتوقع.',
    hint: 'جرّبي مرة ثانية.',
  },
  'provider-failure': {
    message: 'ما قدرنا نجهّز الإطلالة هالمرة، جرّبي مرة ثانية أو استخدمي صورة أوضح.',
  },
}

export const toTryOnError = (error: unknown): TryOnError => {
  if (error instanceof TryOnError) return error
  const fallback = ERROR_MESSAGES['provider-failure']
  return new TryOnError('provider-failure', fallback.message, fallback.hint)
}

export const failure = (code: TryOnErrorCode): TryOnError =>
  new TryOnError(code, ERROR_MESSAGES[code].message, ERROR_MESSAGES[code].hint)

/** تصريح ثابت يظهر تحت كل نتيجة — ما ندّعي مقاسًا مضمونًا. */
export const AI_DISCLAIMER = 'النتيجة تمثيل بصري تقريبي بالذكاء الاصطناعي.'
