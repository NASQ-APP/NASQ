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
 * نعمل بحجم النسخة المحفوظة نفسها. الحساب فوقه يضاعف الزمن بلا فرق مرئي،
 * لأن الناتج يُصغَّر لـ٧٢٠ قبل الحفظ على أي حال.
 */
const MAX_WORK_EDGE = 720

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

  const scale = Math.min(1, MAX_WORK_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    bitmap.close?.()
    throw new ImageProcessingError(imageError('unreadable'))
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const image = context.getImageData(0, 0, width, height)
  const { mask, backgroundRatio } = buildBackgroundMask(image.data, width, height)

  if (backgroundRatio < MIN_BACKGROUND_RATIO || backgroundRatio > MAX_BACKGROUND_RATIO) {
    throw new ImageProcessingError(imageError('removal-empty'))
  }

  // نمزج كل بكسل نحو الأبيض بمقدار ما اعتُبر خلفية — الحافة تتدرّج فما تتسنّن
  const { data } = image
  for (let i = 0; i < mask.length; i++) {
    const backgroundness = mask[i] / 255
    if (backgroundness === 0) continue
    const p = i * 4
    data[p] += (255 - data[p]) * backgroundness
    data[p + 1] += (255 - data[p + 1]) * backgroundness
    data[p + 2] += (255 - data[p + 2]) * backgroundness
    data[p + 3] = 255
  }
  context.putImageData(image, 0, 0)

  return encodeCanvas(canvas)
}
