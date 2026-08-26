/**
 * قراءة لون القطعة من الصورة داخل المتصفح.
 *
 * تشتغل بلا خادم وبلا مفتاح، فلون القطعة يتعبّى تلقائيًا من أول لحظة حتى قبل
 * ما يُفعَّل مزوّد الرؤية.
 *
 * الطريقة: نصغّر الصورة لشبكة صغيرة، نرمي بكسلات الخلفية (البيضاء والشفافة)
 * وحواف الإطار، ثم ناخذ أكثر لون متكرر بعد تقريبه — الوسط الحسابي يعطي رماديًا
 * كاذبًا لما تكون القطعة فيها لونان.
 */
import { nearestItemColor, type ItemColor, type Rgb } from '@/domain/wardrobe'

/** شبكة صغيرة تكفي للون وتخلي القراءة رخيصة. */
const GRID = 48
/** بكسل أفتح من كذا يُعتبر خلفية بيضاء. */
const WHITE_CUTOFF = 242
/** تقريب لتجميع الدرجات المتقاربة في سلّة واحدة. */
const BUCKET = 24

export type ColorReading = { color: ItemColor; rgb: Rgb; coverage: number }

export async function readDominantColor(source: Blob): Promise<ColorReading | undefined> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(source)
  } catch {
    return undefined
  }

  const canvas = document.createElement('canvas')
  canvas.width = GRID
  canvas.height = GRID
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    bitmap.close?.()
    return undefined
  }

  context.drawImage(bitmap, 0, 0, GRID, GRID)
  bitmap.close?.()

  const { data } = context.getImageData(0, 0, GRID, GRID)
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>()
  let counted = 0

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      // نتجاهل الإطار الخارجي: غالبًا خلفية أو ظل
      if (x < 4 || y < 4 || x >= GRID - 4 || y >= GRID - 4) continue

      const index = (y * GRID + x) * 4
      const [r, g, b, alpha] = [data[index], data[index + 1], data[index + 2], data[index + 3]]

      if (alpha < 128) continue
      if (r > WHITE_CUTOFF && g > WHITE_CUTOFF && b > WHITE_CUTOFF) continue

      const key = `${Math.round(r / BUCKET)},${Math.round(g / BUCKET)},${Math.round(b / BUCKET)}`
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
      bucket.count += 1
      bucket.r += r
      bucket.g += g
      bucket.b += b
      buckets.set(key, bucket)
      counted += 1
    }
  }

  if (counted === 0) return undefined

  let top = { count: 0, r: 0, g: 0, b: 0 }
  for (const bucket of buckets.values()) {
    if (bucket.count > top.count) top = bucket
  }

  const rgb: Rgb = {
    r: Math.round(top.r / top.count),
    g: Math.round(top.g / top.count),
    b: Math.round(top.b / top.count),
  }

  return { color: nearestItemColor(rgb), rgb, coverage: top.count / counted }
}
