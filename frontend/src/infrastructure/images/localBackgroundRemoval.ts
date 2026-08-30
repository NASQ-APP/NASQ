/**
 * إزالة الخلفية محليًا في المتصفح — بلا خادم وبلا مفتاح وبلا إنترنت.
 *
 * تناسب الحالة الشائعة: صورة قطعة على سطح شبه موحّد (جدار، سرير، طاولة).
 * الخلفية المزدحمة تحتاج نموذجًا حقيقيًا — وقتها يُفعَّل مزوّد الخادم بدل هذا.
 *
 * الناتج على **خلفية بيضاء**، لأن الشفافية تنقلب سوداء في أي صيغة ما تدعمها.
 */
import { buildBackgroundMask, imageError } from '@/domain/images'
import { ImageProcessingError } from './backgroundRemoval'
import { encodeCanvas } from './prepare'

/**
 * دقّة حساب القناع — منخفضة عمدًا.
 *
 * بناء القناع يمشي على كل بكسل عدّة مرات، فمضاعفة الضلع تضاعف الزمن أربعًا.
 * وحدود الخلفية إشارة عريضة ما تحتاج تفاصيل: القناع المحسوب عند ٧٢٠ يصف نفس
 * الحدود اللي يصفها المحسوب عند ١٦٠٠.
 */
const MAX_WORK_EDGE = 720

/**
 * دقّة الصورة الناتجة — **مفصولة عن دقّة الحساب**.
 *
 * كانت الصورة تُخرَج بحجم العمل نفسه، فأي قطعة تمر على إزالة الخلفية تنزل
 * لـ٧٢٠ وتُحفظ كذا مهما كانت دقّة الأصل. نطبّق القناع بعد تكبيره على الصورة
 * بحجمها الكامل: القناع خريطة ناعمة، وتكبيرها بالاستيفاء يبقي الحافة متدرّجة.
 */
const MAX_OUTPUT_EDGE = 1600

/** أقل نسبة خلفية معقولة: لو أقل، غالبًا ما فيه خلفية واضحة نشيلها. */
const MIN_BACKGROUND_RATIO = 0.04

/** أعلى نسبة معقولة: لو أكثر، أكلت القطعة نفسها. */
const MAX_BACKGROUND_RATIO = 0.97

export async function removeBackgroundLocally(source: Blob): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(source)
  } catch {
    throw new ImageProcessingError(imageError('unreadable'))
  }

  const longest = Math.max(bitmap.width, bitmap.height)
  const fit = (edge: number) => {
    const scale = Math.min(1, edge / longest)
    return {
      width: Math.max(1, Math.round(bitmap.width * scale)),
      height: Math.max(1, Math.round(bitmap.height * scale)),
    }
  }

  /* ---------------- ١ · القناع بدقّة الحساب ---------------- */

  const work = fit(MAX_WORK_EDGE)
  const workContext = surface(work.width, work.height)
  if (!workContext) {
    bitmap.close?.()
    throw new ImageProcessingError(imageError('unreadable'))
  }
  workContext.drawImage(bitmap, 0, 0, work.width, work.height)

  const sample = workContext.getImageData(0, 0, work.width, work.height)
  const { mask, backgroundRatio } = buildBackgroundMask(sample.data, work.width, work.height)

  if (backgroundRatio < MIN_BACKGROUND_RATIO || backgroundRatio > MAX_BACKGROUND_RATIO) {
    bitmap.close?.()
    throw new ImageProcessingError(imageError('removal-empty'))
  }

  /* ---------------- ٢ · الصورة بدقّتها الكاملة ---------------- */

  const out = fit(MAX_OUTPUT_EDGE)
  const outContext = surface(out.width, out.height)
  if (!outContext) {
    bitmap.close?.()
    throw new ImageProcessingError(imageError('unreadable'))
  }
  outContext.drawImage(bitmap, 0, 0, out.width, out.height)
  bitmap.close?.()

  /* ---------------- ٣ · تكبير القناع لحجم الصورة ---------------- */

  const scaled = scaleMask(mask, work, out)
  if (!scaled) throw new ImageProcessingError(imageError('unreadable'))

  /* ---------------- ٤ · المزج نحو الأبيض ---------------- */

  // نمزج كل بكسل نحو الأبيض بمقدار ما اعتُبر خلفية — الحافة تتدرّج فما تتسنّن
  const image = outContext.getImageData(0, 0, out.width, out.height)
  const { data } = image
  for (let i = 0; i < scaled.length; i++) {
    const backgroundness = scaled[i] / 255
    if (backgroundness === 0) continue
    const p = i * 4
    data[p] += (255 - data[p]) * backgroundness
    data[p + 1] += (255 - data[p + 1]) * backgroundness
    data[p + 2] += (255 - data[p + 2]) * backgroundness
    data[p + 3] = 255
  }
  outContext.putImageData(image, 0, 0)

  return encodeCanvas(outContext.canvas)
}

type Size = { width: number; height: number }

/** سطح رسم جاهز للقراءة المتكرّرة — `null` لو رفض المتصفح إعطاء سياق. */
function surface(width: number, height: number): CanvasRenderingContext2D | null {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  return context
}

/**
 * يكبّر القناع من دقّة الحساب لدقّة الصورة.
 *
 * نمرّره عبر الـcanvas بدل استيفاء يدوي: التكبير فيه استيفاء مدمج ومسرَّع،
 * فتبقى الحافة متدرّجة كما هي في القناع الصغير بدل ما تتحوّل لدرجات قافزة.
 * القناع رمادي فنكتبه في القنوات الثلاث ونقرأ إحداها.
 */
function scaleMask(mask: Uint8Array, from: Size, to: Size): Uint8ClampedArray | null {
  // نفس الحجم: القناع كما هو، بلا مرور على الـcanvas
  if (from.width === to.width && from.height === to.height) return new Uint8ClampedArray(mask)

  const source = surface(from.width, from.height)
  if (!source) return null

  const grey = source.createImageData(from.width, from.height)
  for (let i = 0; i < mask.length; i++) {
    const p = i * 4
    grey.data[p] = mask[i]
    grey.data[p + 1] = mask[i]
    grey.data[p + 2] = mask[i]
    grey.data[p + 3] = 255
  }
  source.putImageData(grey, 0, 0)

  const target = surface(to.width, to.height)
  if (!target) return null
  target.drawImage(source.canvas, 0, 0, to.width, to.height)

  const enlarged = target.getImageData(0, 0, to.width, to.height).data
  const flat = new Uint8ClampedArray(to.width * to.height)
  for (let i = 0; i < flat.length; i++) flat[i] = enlarged[i * 4]
  return flat
}
