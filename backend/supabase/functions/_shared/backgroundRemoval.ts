/**
 * إزالة الخلفية — واجهة مزوّد قابلة للتبديل.
 *
 * الواجهة ما تعرف مزوّدًا بعينه، والمكوّنات في الفرونت-إند ما تعرف أن المزوّد
 * موجود أصلاً. تبديل المزوّد = متغيّر بيئة واحد + تنفيذ جديد هنا.
 *
 * قاعدة أمنية (§17): المفتاح يُقرأ من بيئة الدالة فقط، وما يُرجَّع للمتصفح
 * ولا يُسجَّل في أي log.
 *
 * قاعدة معمارية (§19): Deno مو Node — ما فيه معالجة صور محلية هنا. الدالة
 * وسيط يخفي المفتاح ويستدعي API خارجيًا.
 */
import { HandledError } from './response.ts'
import { optionalEnv, requireEnv } from './env.ts'

export type BackgroundRemovalResult = {
  data: Uint8Array
  /** image/png أو image/webp — لازم تحفظ الشفافية */
  contentType: string
}

export type BackgroundRemovalProvider = {
  readonly id: string
  removeBackground(image: Blob, signal: AbortSignal): Promise<BackgroundRemovalResult>
}

/** مهلة الاستدعاء الخارجي — أقصر من مهلة العميل عشان نرجّع خطأ مفهومًا قبله. */
export const PROVIDER_TIMEOUT_MS = 35_000

/**
 * remove.bg — مزوّد شائع لقص المنتجات.
 * `type=product` يناسب الملابس والأحذية والحقائب أكثر من الوضع العام.
 */
const removeBg = (): BackgroundRemovalProvider => ({
  id: 'remove-bg',
  async removeBackground(image, signal) {
    const body = new FormData()
    body.append('image_file', image)
    body.append('size', 'auto')
    body.append('type', 'product')
    body.append('format', 'png')

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': requireEnv('BACKGROUND_REMOVAL_API_KEY') },
      body,
      signal,
    })

    if (response.status === 402 || response.status === 429) {
      throw new HandledError('rate-limited', 'وصلنا حد المعالجة الحالي. جرّبي بعد شوي.', 429)
    }
    if (!response.ok) {
      // ما نسجّل جسم الرد: ممكن يحمل بيانات الصورة
      console.error('provider rejected', { provider: 'remove-bg', status: response.status })
      throw new HandledError('provider-failed', 'تعذّر إزالة الخلفية حاليًا.', 502)
    }

    const data = new Uint8Array(await response.arrayBuffer())
    return { data, contentType: 'image/png' }
  },
})

const REGISTRY: Record<string, () => BackgroundRemovalProvider> = {
  'remove-bg': removeBg,
}

/**
 * المزوّد المفعّل، أو `null` لو ما فيه.
 * غيابه ليس خطأ — الواجهة تعرض «احتفظي بالصورة الأصلية» بدل ما تزيّف نتيجة.
 */
export function backgroundRemovalProvider(): BackgroundRemovalProvider | null {
  const configured = optionalEnv('BACKGROUND_REMOVAL_PROVIDER')
  const factory = REGISTRY[configured]
  if (!factory || !optionalEnv('BACKGROUND_REMOVAL_API_KEY')) return null
  return factory()
}
