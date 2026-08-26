/**
 * تجهيز الصور في المتصفح: تصغير قبل الإرسال، وقص مربّع قبل الحفظ.
 *
 * ليش نصغّر: صورة الجوال ٤ ميجا، ورفعها كما هي يبطّئ المعالجة بلا فائدة —
 * القطعة تُقرأ بوضوح عند ١٦٠٠ بكسل. وليش نقصّ مربّع قبل الحفظ: البطاقات
 * مربّعة، فالقص هنا يمنع تشويه الشبكة لاحقًا.
 *
 * **الشفافية تُحفظ**: الصورة المنقّاة تُرمّز PNG، فما تنقلب خلفيتها سوداء أو
 * بيضاء بعد المعالجة.
 */
import { imageError } from '@/domain/images'
import { ImageProcessingError } from './backgroundRemoval'

/** أقصى ضلع للصورة المرسلة للخادم. */
const MAX_UPLOAD_EDGE = 1600
/** ضلع النسخة المحفوظة للعرض. */
const STORAGE_EDGE = 720
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
 * قص مربّع من المنتصف بحجم العرض، **على خلفية بيضاء دائمًا**.
 *
 * الصورة بعد إزالة الخلفية تجي شفافة، والشفافية تنقلب سوداء في أي صيغة ما
 * تدعمها. نسطّحها على أبيض هنا فتطلع القطعة على خلفية نظيفة موحّدة في كل
 * الشاشات، ويصير الخرج JPEG أخفّ.
 */
export async function prepareForStorage(source: Blob): Promise<PreparedImage> {
  const bitmap = await decode(source)
  const side = Math.min(bitmap.width, bitmap.height)
  const edge = Math.min(side, STORAGE_EDGE)

  const context = draw(edge, edge)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, edge, edge)
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    edge,
    edge,
  )
  bitmap.close?.()

  return encode(context)
}
