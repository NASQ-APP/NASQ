/**
 * فحص الصورة الشخصية (A-06).
 *
 * ما نفحص هنا إلا اللي يمكن فحصه فعلاً في المتصفح. كشف الشخص واكتمال الجسم
 * وعدد الوجوه تحتاج نموذجًا في الخادم، فتُعلن في `deferredChecks` بدل ما تُزيَّف.
 *
 * الصورة ما تغادر المتصفح في هذي النسخة: تُحفظ كرابط كائن وتُحذف عند الطلب.
 */
import type { PhotoIssue, PhotoValidationResult } from '@/domain/model/types'

const MAX_MB = 12
const MIN_EDGE = 480
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export async function validatePhoto(file: File): Promise<PhotoValidationResult> {
  const issues: PhotoIssue[] = []
  const sizeKb = Math.round(file.size / 1024)

  if (!ACCEPTED.includes(file.type)) {
    issues.push({
      code: 'unsupported-type',
      message: 'نقبل JPG أو PNG أو WebP فقط.',
      severity: 'blocking',
    })
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    issues.push({
      code: 'too-large',
      message: `حجم الصورة أكبر من ${MAX_MB} ميجا.`,
      severity: 'blocking',
    })
  }

  const bitmap = await readImage(file).catch(() => null)
  if (!bitmap) {
    return {
      ok: false,
      issues: [{ code: 'unsupported-type', message: 'ما قدرنا نفتح هذي الصورة.', severity: 'blocking' }],
      meta: { width: 0, height: 0, brightness: 0, sizeKb },
      deferredChecks: [],
    }
  }

  const { width, height } = bitmap
  if (Math.min(width, height) < MIN_EDGE) {
    issues.push({
      code: 'too-small',
      message: 'دقة الصورة منخفضة — نحتاج ٤٨٠ بكسل على الأقل للضلع الأصغر.',
      severity: 'blocking',
    })
  }

  const ratio = height / width
  if (ratio < 1.05) {
    issues.push({
      code: 'bad-aspect',
      message: 'الصورة عرضية. الصورة الطولية الكاملة تعطي نتيجة أدق.',
      severity: 'advisory',
    })
  }

  const { brightness, detail } = analyse(bitmap)
  if (brightness < 46) {
    issues.push({ code: 'too-dark', message: 'الصورة معتمة. صوّري في مكان أفتح.', severity: 'blocking' })
  } else if (brightness > 226) {
    issues.push({ code: 'too-bright', message: 'الإضاءة قوية جدًا وضايعة التفاصيل.', severity: 'advisory' })
  }
  if (detail < 6) {
    issues.push({
      code: 'low-detail',
      message: 'الصورة تبدو غير واضحة أو مهزوزة.',
      severity: 'advisory',
    })
  }

  bitmap.close?.()

  return {
    ok: !issues.some((i) => i.severity === 'blocking'),
    issues,
    meta: { width, height, brightness: Math.round(brightness), sizeKb },
    deferredChecks: [
      'التأكد من وجود شخص واحد فقط',
      'التأكد أن الجسم كامل وظاهر',
      'كشف الوجه وزاوية الوقوف',
    ],
  }
}

async function readImage(file: File): Promise<ImageBitmap> {
  if ('createImageBitmap' in window) return createImageBitmap(file)
  throw new Error('unsupported')
}

/** متوسط الإضاءة + مؤشر رخيص لطاقة الحواف يقيس «هل الصورة مهزوزة» */
function analyse(bitmap: ImageBitmap): { brightness: number; detail: number } {
  const w = 64
  const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * w))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { brightness: 128, detail: 20 }
  ctx.drawImage(bitmap, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const lum = new Float32Array(w * h)
  let sum = 0
  for (let i = 0; i < w * h; i++) {
    const v = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]
    lum[i] = v
    sum += v
  }
  const brightness = sum / (w * h)

  let energy = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      energy += Math.abs(lum[i] - lum[i - 1]) + Math.abs(lum[i] - lum[i - w])
    }
  }
  return { brightness, detail: energy / (w * h) }
}

export const PHOTO_GUIDELINES = [
  'صورة كاملة للجسم من الرأس للقدم',
  'وقفة مواجهة للكاميرا',
  'الجسم كامل ظاهر وغير مقصوص',
  'إضاءة جيدة وخلفية بسيطة',
  'بدون فلاتر قوية',
  'شخص واحد فقط في الصورة',
]
