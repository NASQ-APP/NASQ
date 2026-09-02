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

/**
 * `image/jpg` صيغةٌ لا وجود لها في المواصفة، وبعض الأجهزة ترسلها.
 *
 * `validateImageFile` — الحارس الأول عند اختيار الملف — يطبّعها منذ البداية،
 * وهذا الفحص كان لا يطبّعها. فتمرّ الصورة من البوابة الأولى ثم تُرفض في
 * الثانية بحجّة «الصيغة غير مدعومة»، وهي JPEG سليمة. التطبيع هنا يغلق الفجوة.
 */
const normalizeType = (type: string) => (type === 'image/jpg' ? 'image/jpeg' : type)

/** ما قيسَ عن الصورة — مدخلات القرار، بلا `canvas` ولا `File`. */
export type PhotoMeasurements = {
  type: string
  bytes: number
  width: number
  height: number
  brightness: number
  detail: number
}

/**
 * القرار وحده، مفصولاً عن القياس.
 *
 * القياس يحتاج `createImageBitmap` و`canvas`، وهما لا يعيشان خارج المتصفح —
 * فكانت كل العتبات غير قابلة للاختبار، وتُعدَّل بالظنّ. الفصل هنا يجعل
 * «هل تُرفض هذي الصورة ولماذا» سؤالاً يُجاب في اختبار.
 */
export function photoIssues(m: PhotoMeasurements): PhotoIssue[] {
  const issues: PhotoIssue[] = []

  if (!ACCEPTED.includes(normalizeType(m.type))) {
    issues.push({
      code: 'unsupported-type',
      message: 'نقبل JPG أو PNG أو WebP فقط.',
      severity: 'blocking',
    })
  }
  if (m.bytes > MAX_MB * 1024 * 1024) {
    issues.push({
      code: 'too-large',
      message: `حجم الصورة أكبر من ${MAX_MB} ميجا.`,
      severity: 'blocking',
    })
  }

  const { width, height } = m
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

  /*
    الإعتام يمنع فقط حين تكون الصورة **غير قابلة للاستعمال**، لا حين تكون داكنة.

    كان الحدّ ٤٦ ومانعًا، وهو متوسط إضاءة الصورة كلها: امرأة بلبس داكن أمام
    جدار داكن، أو لقطة في غرفة بإضاءة مسائية، تنزل تحته وهي واضحة تمامًا —
    فتُرفض صورة صالحة. المتوسط يصف الخلفية أكثر مما يصف الشخص.

    الحدّ المانع الآن هو السواد الفعلي (٢٥) — إطار لا يُرى فيه شيء ولا يفيد
    المزوّد. وما بينه وبين ٦٠ تنبيهٌ يُقال ولا يوقف.
  */
  const { brightness, detail } = m
  if (brightness < 25) {
    issues.push({
      code: 'too-dark',
      message: 'الصورة معتمة لدرجة ما نميّز فيها الشخص — نحتاج إضاءة أوضح.',
      severity: 'blocking',
    })
  } else if (brightness < 60) {
    issues.push({
      code: 'too-dark',
      message: 'الإضاءة خافتة — مكان أفتح يعطي نتيجة أدق.',
      severity: 'advisory',
    })
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

  return issues
}

export async function validatePhoto(file: File): Promise<PhotoValidationResult> {
  const sizeKb = Math.round(file.size / 1024)

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
  const { brightness, detail } = analyse(bitmap)
  bitmap.close?.()

  const issues = photoIssues({ type: file.type, bytes: file.size, width, height, brightness, detail })

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
