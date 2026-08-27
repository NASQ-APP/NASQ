/**
 * اختيار صورة القطعة وحدها من بين صور المنتج.
 *
 * اسم الملف ما يكفي — نمشي مثلًا تسمّي صورها UUID. فنقرأ البكسلات نفسها:
 * نحمّل الصورة عبر وسيط التطوير (شبكات المتاجر ما ترسل ترويسة CORS، فالقراءة
 * المباشرة تلوّث الـcanvas)، ونعطي كل صورة درجة «فيها شخص».
 *
 * **هذا ترجيح، مب يقين.** يفشل مع القطع بلون البشرة، ومع العارضة المغطّاة
 * بالكامل، ومع درجات البشرة الداكنة. عشان كذا الاختيار اليدوي موجود في صفحة
 * القطعة، وهذا مجرد الافتراضي. (بلا إزالة أشخاص بالذكاء الاصطناعي.)
 */
import { loadImage, proxiedImage, registerImages } from '@/infrastructure/rendering/remoteImage'
import { isSkin } from '@/infrastructure/rendering/skin'

/** درجة صورة واحدة — كل ما قلّت `personScore` كانت الصورة أقرب لقطعة وحدها. */
export type ImageScore = {
  src: string
  /** ٠ = ما لقينا أثر شخص · ١ = الصورة كلها بشرة */
  personScore: number
  /** نقاء الخلفية — يفصل التعادل */
  cleanBackground: number
  /** هل قدرنا نقرأ الصورة أصلًا؟ */
  read: boolean
}

/** عرض التحليل بالبكسل — صغير عن قصد، الإشارات إحصائية ما تحتاج تفاصيل. */
const SAMPLE_WIDTH = 96

/** أبيض أو رمادي فاتح موحّد — خلفية استوديو. */
const isBackdrop = (r: number, g: number, b: number): boolean =>
  r > 228 && g > 228 && b > 228 && Math.max(r, g, b) - Math.min(r, g, b) < 16

/**
 * يقرأ صورة واحدة ويعطيها درجة.
 *
 * ما نكتفي بنسبة البشرة: نطلب كمان أن تتجمّع في الثلث الأعلى (وجه/رقبة) أو
 * في كتل عريضة (ذراع/ساق). ألوان القماش البيج تنتشر على الصورة كلها بلا
 * تجمّع، فهذا الشرط يقلّل الإنذار الكاذب — ما يلغيه.
 */
const scores = new Map<string, ImageScore>()

async function scoreImage(src: string): Promise<ImageScore> {
  const known = scores.get(src)
  if (known) return known
  const measured = await measure(src)
  if (measured.read) scores.set(src, measured)
  return measured
}

async function measure(src: string): Promise<ImageScore> {
  const blank: ImageScore = { src, personScore: 0.5, cleanBackground: 0, read: false }

  let image: HTMLImageElement
  try {
    image = await loadImage(proxiedImage(src))
  } catch {
    return blank
  }
  if (!image.naturalWidth || !image.naturalHeight) return blank

  const width = SAMPLE_WIDTH
  const height = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * width))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return blank
  context.drawImage(image, 0, 0, width, height)

  let pixels: Uint8ClampedArray
  try {
    pixels = context.getImageData(0, 0, width, height).data
  } catch {
    // الصورة ما مرّت عبر الوسيط فتلوّث الـcanvas
    return blank
  }

  const skinRows: number[] = Array.from({ length: height }, () => 0)
  let skin = 0
  let backdrop = 0
  const total = width * height

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      if (isSkin(r, g, b)) {
        skin += 1
        skinRows[y] += 1
      } else if (isBackdrop(r, g, b)) {
        backdrop += 1
      }
    }
  }

  const skinRatio = skin / total
  const topThird = skinRows.slice(0, Math.round(height / 3)).reduce((a, b) => a + b, 0)
  /** بشرة مركّزة فوق = وجه على الأغلب، وهذي أقوى دلالة على وجود شخص. */
  const headBias = skin > 0 ? topThird / skin : 0
  /** صفوف فيها كتلة بشرة عريضة — ذراع أو ساق، مب تشتّت لون قماش. */
  const denseRows = skinRows.filter((count) => count > width * 0.18).length / height

  const personScore = Math.min(1, skinRatio * 3 + headBias * skinRatio * 6 + denseRows * 0.8)

  return { src, personScore, cleanBackground: backdrop / total, read: true }
}

/** تحت هذي الدرجة نعتبر الصورة «قطعة وحدها». */
export const PERSON_CUTOFF = 0.06

export const isProductOnly = (score?: ImageScore): boolean =>
  Boolean(score?.read) && (score as ImageScore).personScore < PERSON_CUTOFF

/** يفحص مجموعة صور مرة وحدة — النتيجة محفوظة، فإعادة النداء رخيصة. */
export async function scoreImages(images: string[]): Promise<ImageScore[]> {
  if (images.length === 0) return []
  await registerImages(images)
  return Promise.all(images.map(scoreImage))
}

/**
 * يرتّب صور المنتج ويختار أفضلها.
 *
 * لو كل الصور فيها شخص — ما نزيل أحدًا ولا نخترع صورة، نرجّع أقلها ظهورًا
 * للشخص ونقول `foundProductOnly: false`.
 */
export async function pickBestImage(
  images: string[],
): Promise<{ best?: string; scores: ImageScore[]; foundProductOnly: boolean }> {
  if (images.length === 0) return { scores: [], foundProductOnly: false }

  const measured = await scoreImages(images)
  const readable = measured.filter((s) => s.read)
  if (readable.length === 0) {
    return { best: images[0], scores: measured, foundProductOnly: false }
  }

  const ranked = readable.toSorted(
    (a, b) => a.personScore - b.personScore || b.cleanBackground - a.cleanBackground,
  )
  const winner = ranked[0]
  return { best: winner.src, scores: measured, foundProductOnly: isProductOnly(winner) }
}
