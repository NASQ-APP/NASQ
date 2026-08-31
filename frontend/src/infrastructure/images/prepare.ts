/**
 * تجهيز الصور في المتصفح: تصغير قبل الإرسال، وقص مربّع قبل الحفظ.
 *
 * ليش نصغّر: صورة الجوال ٤ ميجا، ورفعها كما هي يبطّئ المعالجة بلا فائدة —
 * القطعة تُقرأ بوضوح عند ١٦٠٠ بكسل. وليش مربّع قبل الحفظ: البطاقات
 * مربّعة، فتوحيد المقاس هنا يمنع تشويه الشبكة لاحقًا — باحتواء لا بقصّ.
 *
 * **الشفافية تُحفظ**: الصورة المنقّاة تُرمّز PNG، فما تنقلب خلفيتها سوداء أو
 * بيضاء بعد المعالجة.
 */
import { imageError } from '@/domain/images'
import { ImageProcessingError } from './backgroundRemoval'

/** أقصى ضلع للصورة المرسلة للخادم. */
const MAX_UPLOAD_EDGE = 1600
/**
 * ضلع النسخة المحفوظة للعرض.
 *
 * كان ٧٢٠ فتطلع القطعة ناعمة الحواف: صفحة القطعة تعرضها في مربّع يقارب ٤٥٠
 * بكسل CSS، والشاشات اليوم بكثافة ٢× أو ٣× — يعني تحتاج ٩٠٠ إلى ١٣٥٠ بكسل
 * حقيقيًا. ٧٢٠ تُمدّ فوق حجمها فتبان غير واضحة.
 */
const STORAGE_EDGE = 1440
const JPEG_QUALITY = 0.9
const WEBP_QUALITY = 0.92

export type PreparedImage = { blob: Blob; width: number; height: number }

const unreadable = (): never => {
  throw new ImageProcessingError(imageError('unreadable'))
}

async function decode(source: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(source)
  } catch {
    return unreadable()
  }
}

function draw(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return unreadable()

  /* التصغير الافتراضي في الـcanvas يأخذ عيّنات متباعدة، فتتكسّر الخيوط
     والحواف الدقيقة عند النزول من ٣٠٠٠ بكسل. الجودة العالية تقرأ الجوار
     كاملاً فتبقى القطعة حادّة. */
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  return context
}

/**
 * ترميز موحّد لكل الصور المعالجة.
 *
 * WebP أولاً: بنفس الجودة يعطي نصف حجم JPEG تقريبًا وأسرع في الترميز. ولو
 * كان المتصفح ما يدعمه (متصفحات قديمة) يرجّع نوعًا غير المطلوب، فنرجع لـJPEG.
 */
export async function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
  )
  if (webp?.type === 'image/webp') return webp

  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!jpeg) return unreadable()
  return jpeg
}

async function encode(context: CanvasRenderingContext2D): Promise<PreparedImage> {
  const { canvas } = context
  return { blob: await encodeCanvas(canvas), width: canvas.width, height: canvas.height }
}

/**
 * تصغير للإرسال مع الحفاظ على النسبة والشفافية.
 * الصورة الصغيرة أصلاً تُرجَع كما هي — ما نعيد ترميزها بلا داعٍ.
 */
export async function prepareForUpload(file: File): Promise<Blob> {
  const bitmap = await decode(file)
  const longest = Math.max(bitmap.width, bitmap.height)

  if (longest <= MAX_UPLOAD_EDGE) {
    bitmap.close?.()
    return file
  }

  const scale = MAX_UPLOAD_EDGE / longest
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const context = draw(width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const { blob } = await encode(context)
  return blob
}

/**
 * مربّع يسع القطعة كاملة، **على خلفية بيضاء دائمًا**.
 *
 * كان قصًا من المنتصف بضلع أقصر الأبعاد — وصور الملابس طولية غالبًا، فالفستان
 * بـ١٠٠٠×١٥٠٠ يفقد ٢٥٠ بكسل من فوق ومثلها من تحت: يروح الذيل والأكمام وتبقى
 * الوسط وحده. والمستخدمة صوّرت قطعتها كاملة، فقصّها يحذف ما قصدته بلا ما تدري.
 *
 * الحين **نحتوي لا نقصّ**: المربّع يبقى (البطاقات مربّعة والشبكة تحتاج مقاسًا
 * واحدًا)، لكن القطعة تُقاس داخله بكاملها ويُملأ الفارغ أبيض. خلفية بيضاء أوسع
 * أرخص من فستان مقطوع.
 *
 * والشفافية تُسطّح على أبيض: الصورة بعد إزالة الخلفية تجي شفافة، والشفافية
 * تنقلب سوداء في أي صيغة ما تدعمها.
 */
export async function prepareForStorage(source: Blob): Promise<PreparedImage> {
  const bitmap = await decode(source)

  // الضلع يتبع أطول بُعد لا أقصره، وما نمدّ صورة صغيرة فوق حجمها
  const longest = Math.max(bitmap.width, bitmap.height)
  const edge = Math.min(longest, STORAGE_EDGE)

  const scale = edge / longest
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const context = draw(edge, edge)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, edge, edge)
  context.drawImage(bitmap, (edge - width) / 2, (edge - height) / 2, width, height)
  bitmap.close?.()

  return encode(context)
}
